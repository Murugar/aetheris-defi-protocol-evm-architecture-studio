export interface ContractFile {
  name: string;
  path: string;
  description: string;
  language: 'solidity';
  category: 'core' | 'dex' | 'lending' | 'vaults' | 'staking' | 'tests';
  code: string;
}

export const SOLIDITY_CONTRACTS: ContractFile[] = [
  {
    name: 'AetherisPair.sol',
    path: 'contracts/dex/AetherisPair.sol',
    category: 'dex',
    description: 'Constant Product AMM ($x \\cdot y = k$) pool contract with flash swaps and TWAP oracle accumulator.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {UQ112x112} from "./libraries/UQ112x112.sol";

interface IAetherisCallee {
    function aetherisCall(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}

/**
 * @title AetherisPair
 * @notice Constant Product AMM Pool implementing x * y = k with flash swaps and TWAP oracle.
 */
contract AetherisPair is ERC20, ReentrancyGuard {
    using UQ112x112 for uint224;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes("transfer(address,uint256)")));

    address public immutable factory;
    address public immutable token0;
    address public immutable token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast; // reserve0 * reserve1 as of immediately after most recent liquidity event

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error InsufficientOutputAmount();
    error InsufficientLiquidity();
    error InvalidK();
    error Unauthorized();

    constructor(address _token0, address _token1) ERC20("Aetheris LP Token", "AETH-LP") {
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /// @notice Updates reserves and, on the first call per block, price accumulators for TWAP
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - blockTimestampLast;
        }
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // Price accumulators for Time-Weighted Average Price (TWAP)
            price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    /// @notice Mint LP tokens to 'to' based on transferred assets
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // Permanently lock first MINIMUM_LIQUIDITY
        } else {
            liquidity = Math.min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        if (liquidity == 0) revert InsufficientLiquidityMinted();
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        kLast = uint256(reserve0) * reserve1;
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Burn LP tokens sent to this contract and return tokens to 'to'
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidityBurned();

        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        kLast = uint256(reserve0) * reserve1;
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Constant product swap with flash swap support
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity();

        uint256 balance0;
        uint256 balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            if (to == _token0 || to == _token1) revert Unauthorized();
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            
            // Flash loan callback
            if (data.length > 0) IAetherisCallee(to).aetherisCall(msg.sender, amount0Out, amount1Out, data);
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        if (amount0In == 0 && amount1In == 0) revert InsufficientLiquidity();

        // 0.3% protocol fee invariant check: (balance0 - 0.003*amountIn0) * (balance1 - 0.003*amountIn1) >= reserve0 * reserve1
        {
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * _reserve1 * (1000**2)) {
                revert InvalidK();
            }
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }
}`
  },
  {
    name: 'AetherisRouter.sol',
    path: 'contracts/dex/AetherisRouter.sol',
    category: 'dex',
    description: 'Routing contract handling token approval, multi-hop swaps, and slippage protection.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AetherisPair} from "./AetherisPair.sol";

contract AetherisRouter {
    address public immutable factory;

    error Expired();
    error InsufficientAAmount();
    error InsufficientBAmount();
    error InsufficientOutputAmount();
    error ExcessiveInputAmount();

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair = getPair(tokenA, tokenB);
        (uint112 reserveA, uint112 reserveB,) = AetherisPair(pair).getReserves();

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientBAmount();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                if (amountAOptimal < amountAMin) revert InsufficientAAmount();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }

        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        liquidity = AetherisPair(pair).mint(to);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();

        address firstPair = getPair(path[0], path[1]);
        IERC20(path[0]).transferFrom(msg.sender, firstPair, amounts[0]);
        _swap(amounts, path, to);
    }

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = input < output ? (input, output) : (output, input);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? getPair(output, path[i + 2]) : _to;
            AetherisPair(getPair(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0 && reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        return (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            address pair = getPair(path[i], path[i + 1]);
            (uint112 reserve0, uint112 reserve1,) = AetherisPair(pair).getReserves();
            (address token0,) = path[i] < path[i + 1] ? (path[i], path[i + 1]) : (path[i + 1], path[i]);
            (uint256 reserveIn, uint256 reserveOut) = path[i] == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function getPair(address tokenA, address tokenB) public view returns (address) {
        // Return deterministic address or factory lookup
        return address(uint160(uint256(keccak256(abi.encodePacked(tokenA, tokenB, factory)))));
    }
}`
  },
  {
    name: 'AetherisLendingPool.sol',
    path: 'contracts/lending/AetherisLendingPool.sol',
    category: 'lending',
    description: 'Algorithmic lending protocol with kinked jump rate interest model, health factor calculation, and liquidation engine.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPriceOracle {
    function getAssetPrice(address asset) external view returns (uint256);
}

/**
 * @title AetherisLendingPool
 * @notice Multi-collateral lending market with kinked interest rate curve & liquidations.
 */
contract AetherisLendingPool is ReentrancyGuard {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant COLLATERAL_FACTOR = 75e16; // 75% Max LTV
    uint256 public constant LIQUIDATION_THRESHOLD = 80e16; // 80%
    uint256 public constant LIQUIDATION_BONUS = 105e16; // 5% bonus to liquidators
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    // Kinked Interest Rate Curve Parameters:
    // Base rate: 2%
    // Slope 1 (below optimal utilization 80%): 4%
    // Slope 2 (above optimal utilization): 60%
    uint256 public constant OPTIMAL_UTILIZATION = 80e16; // 80%
    uint256 public constant BASE_BORROW_RATE = 2e16; // 2%
    uint256 public constant SLOPE1 = 4e16; // 4%
    uint256 public constant SLOPE2 = 60e16; // 60%

    struct ReserveData {
        uint256 totalSupplied;
        uint256 totalBorrowed;
        uint256 borrowIndex;
        uint256 lastUpdateTimestamp;
    }

    struct UserData {
        uint256 supplied;
        uint256 borrowed;
        uint256 interestIndex;
    }

    IPriceOracle public oracle;
    mapping(address => ReserveData) public reserves;
    mapping(address => mapping(address => UserData)) public users; // asset => user => data

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event Liquidate(
        address indexed liquidator,
        address indexed borrower,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 collateralLiquidated
    );

    error HealthFactorTooLow();
    error HealthFactorAboveThreshold();
    error ExceedsCollateralCapacity();
    error InsufficientLiquidity();

    constructor(address _oracle) {
        oracle = IPriceOracle(_oracle);
    }

    /// @notice Computes current borrow rate based on pool utilization: U = Borrows / Supply
    function getBorrowRate(address asset) public view returns (uint256) {
        ReserveData storage res = reserves[asset];
        if (res.totalSupplied == 0) return BASE_BORROW_RATE;
        uint256 utilization = (res.totalBorrowed * PRECISION) / res.totalSupplied;

        if (utilization <= OPTIMAL_UTILIZATION) {
            return BASE_BORROW_RATE + (utilization * SLOPE1) / OPTIMAL_UTILIZATION;
        } else {
            uint256 excessUtilization = utilization - OPTIMAL_UTILIZATION;
            return BASE_BORROW_RATE + SLOPE1 + (excessUtilization * SLOPE2) / (PRECISION - OPTIMAL_UTILIZATION);
        }
    }

    /// @notice Supply tokens to earn interest and enable borrowing
    function deposit(address asset, uint256 amount) external nonReentrant {
        _accrueInterest(asset);
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        reserves[asset].totalSupplied += amount;
        users[asset][msg.sender].supplied += amount;
        emit Deposit(msg.sender, asset, amount);
    }

    /// @notice Borrow tokens against posted collateral
    function borrow(address asset, uint256 amount) external nonReentrant {
        _accrueInterest(asset);
        ReserveData storage res = reserves[asset];
        if (amount > res.totalSupplied - res.totalBorrowed) revert InsufficientLiquidity();

        res.totalBorrowed += amount;
        users[asset][msg.sender].borrowed += amount;

        uint256 healthFactor = calculateHealthFactor(msg.sender);
        if (healthFactor < PRECISION) revert HealthFactorTooLow();

        IERC20(asset).transfer(msg.sender, amount);
        emit Borrow(msg.sender, asset, amount);
    }

    /// @notice Repay debt with interest
    function repay(address asset, uint256 amount) external nonReentrant {
        _accrueInterest(asset);
        uint256 userDebt = users[asset][msg.sender].borrowed;
        uint256 payback = amount > userDebt ? userDebt : amount;

        IERC20(asset).transferFrom(msg.sender, address(this), payback);
        reserves[asset].totalBorrowed -= payback;
        users[asset][msg.sender].borrowed -= payback;
        emit Repay(msg.sender, asset, payback);
    }

    /// @notice Liquidates underwater position when health factor < 1.0
    function liquidate(
        address borrower,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external nonReentrant {
        _accrueInterest(collateralAsset);
        _accrueInterest(debtAsset);

        uint256 healthFactor = calculateHealthFactor(borrower);
        if (healthFactor >= PRECISION) revert HealthFactorAboveThreshold();

        uint256 collateralPrice = oracle.getAssetPrice(collateralAsset);
        uint256 debtPrice = oracle.getAssetPrice(debtAsset);

        // Calculate collateral needed with 5% liquidation bonus
        uint256 collateralToSeize = (debtToCover * debtPrice * LIQUIDATION_BONUS) / (collateralPrice * PRECISION);

        IERC20(debtAsset).transferFrom(msg.sender, address(this), debtToCover);
        reserves[debtAsset].totalBorrowed -= debtToCover;
        users[debtAsset][borrower].borrowed -= debtToCover;

        users[collateralAsset][borrower].supplied -= collateralToSeize;
        reserves[collateralAsset].totalSupplied -= collateralToSeize;
        IERC20(collateralAsset).transfer(msg.sender, collateralToSeize);

        emit Liquidate(msg.sender, borrower, collateralAsset, debtAsset, debtToCover, collateralToSeize);
    }

    /// @notice Health Factor = (Total Collateral Value * Liquidation Threshold) / Total Borrow Value
    function calculateHealthFactor(address user) public view returns (uint256) {
        // Simplified multi-asset valuation using mock oracles
        uint256 totalCollateralValueEth = (users[address(0x1)][user].supplied * oracle.getAssetPrice(address(0x1))) / PRECISION;
        uint256 totalDebtValueEth = (users[address(0x2)][user].borrowed * oracle.getAssetPrice(address(0x2))) / PRECISION;

        if (totalDebtValueEth == 0) return type(uint256).max;
        return (totalCollateralValueEth * LIQUIDATION_THRESHOLD) / totalDebtValueEth;
    }

    function _accrueInterest(address asset) internal {
        ReserveData storage res = reserves[asset];
        if (res.lastUpdateTimestamp == 0) {
            res.lastUpdateTimestamp = block.timestamp;
            return;
        }
        uint256 timeDelta = block.timestamp - res.lastUpdateTimestamp;
        if (timeDelta == 0) return;

        uint256 borrowRate = getBorrowRate(asset);
        uint256 interestAccrued = (res.totalBorrowed * borrowRate * timeDelta) / (SECONDS_PER_YEAR * PRECISION);
        res.totalBorrowed += interestAccrued;
        res.totalSupplied += interestAccrued; // In zero-reserve spread model
        res.lastUpdateTimestamp = block.timestamp;
    }
}`
  },
  {
    name: 'AetherisVaultERC4626.sol',
    path: 'contracts/vaults/AetherisVaultERC4626.sol',
    category: 'vaults',
    description: 'ERC-4626 Tokenized Vault standard with shares-to-assets pricing and virtual offset protection.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AetherisVaultERC4626
 * @notice Standardized Yield Vault conforming to EIP-4626 with anti-inflation attack virtual shares.
 */
contract AetherisVaultERC4626 is ERC4626 {
    using Math for uint256;

    uint256 private constant _OFFSET = 1e3; // Virtual decimals offset to prevent share inflation attack
    address public immutable strategist;

    event Harvest(uint256 yieldGenerated, uint256 newTotalAssets);

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_
    ) ERC4626(asset_) ERC20(name_, symbol_) {
        strategist = msg.sender;
    }

    /// @dev Internal conversion assets -> shares with virtual decimals
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        return assets.mulDiv(totalSupply() + 10 ** _decimalsOffset(), totalAssets() + 1, rounding);
    }

    /// @dev Internal conversion shares -> assets with virtual decimals
    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        return shares.mulDiv(totalAssets() + 1, totalSupply() + 10 ** _decimalsOffset(), rounding);
    }

    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    /// @notice Strategist deposits yield into vault, increasing share value for all depositors
    function harvestYield(uint256 yieldAmount) external {
        require(msg.sender == strategist, "ONLY_STRATEGIST");
        IERC20(asset()).transferFrom(msg.sender, address(this), yieldAmount);
        emit Harvest(yieldAmount, totalAssets());
    }
}`
  },
  {
    name: 'AetherisStakingRewards.sol',
    path: 'contracts/staking/AetherisStakingRewards.sol',
    category: 'staking',
    description: 'Synthetix-style staking rewards contract with real-time accumulator and time-weighted lock multipliers.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AetherisStakingRewards
 * @notice Continuous reward accumulator with duration-based boost multipliers.
 */
contract AetherisStakingRewards is ReentrancyGuard {
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;

    uint256 public periodFinish;
    uint256 public rewardRate; // Rewards per second
    uint256 public rewardsDuration = 30 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    struct LockPosition {
        uint256 amount;
        uint256 boostMultiplier; // 100 = 1.0x, 200 = 2.0x
        uint256 unlockTimestamp;
        uint256 userRewardPerTokenPaid;
        uint256 rewards;
    }

    mapping(address => LockPosition) public positions;
    uint256 public totalWeightedStake;

    event Staked(address indexed user, uint256 amount, uint256 lockDuration, uint256 multiplier);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            positions[account].rewards = earned(account);
            positions[account].userRewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalWeightedStake == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + (((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalWeightedStake);
    }

    function earned(address account) public view returns (uint256) {
        LockPosition storage pos = positions[account];
        uint256 weightedAmount = (pos.amount * pos.boostMultiplier) / 100;
        return ((weightedAmount * (rewardPerToken() - pos.userRewardPerTokenPaid)) / 1e18) + pos.rewards;
    }

    /// @notice Stake with lock boost: 0 days = 100 (1.0x), 30 days = 150 (1.5x), 90 days = 200 (2.0x), 365 days = 250 (2.5x)
    function stake(uint256 amount, uint256 lockDays) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "CANNOT_STAKE_0");
        uint256 multiplier = 100;
        if (lockDays >= 365) multiplier = 250;
        else if (lockDays >= 90) multiplier = 200;
        else if (lockDays >= 30) multiplier = 150;

        stakingToken.transferFrom(msg.sender, address(this), amount);

        LockPosition storage pos = positions[msg.sender];
        pos.amount += amount;
        pos.boostMultiplier = multiplier;
        pos.unlockTimestamp = block.timestamp + (lockDays * 1 days);

        uint256 addedWeighted = (amount * multiplier) / 100;
        totalWeightedStake += addedWeighted;

        emit Staked(msg.sender, amount, lockDays, multiplier);
    }

    function claimReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = positions[msg.sender].rewards;
        if (reward > 0) {
            positions[msg.sender].rewards = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }
}`
  },
  {
    name: 'AetherisPair.t.sol',
    path: 'test/foundry/AetherisPair.t.sol',
    category: 'tests',
    description: 'Foundry Forge test suite: Constant product invariant tests, slippage checks, and flash swaps.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AetherisPair} from "../../contracts/dex/AetherisPair.sol";
import {AetherToken} from "../../contracts/AetherToken.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract AetherisPairTest is Test {
    AetherisPair pair;
    AetherToken aeth;
    MockERC20 usdc;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        aeth = new AetherToken();
        usdc = new MockERC20("USD Coin", "USDC", 6);
        pair = new AetherisPair(address(aeth), address(usdc));

        // Initial Liquidity: 100 AETH : 300,000 USDC ($3,000 / AETH)
        aeth.mint(address(pair), 100 ether);
        usdc.mint(address(pair), 300_000 * 1e6);
        pair.mint(address(this));
    }

    function test_SwapConstantProductMath() public {
        // Alice swaps 10,000 USDC for AETH
        usdc.mint(alice, 10_000 * 1e6);

        vm.startPrank(alice);
        usdc.transfer(address(pair), 10_000 * 1e6);

        // Expected out: (10,000 * 0.997 * 100) / (300,000 + 10,000 * 0.997) ≈ 3.216 AETH
        uint256 expectedOut = 3216336585140889212;
        pair.swap(expectedOut, 0, alice, "");
        vm.stopPrank();

        assertEq(aeth.balanceOf(alice), expectedOut);
    }

    function test_RevertWhenSlippageExceeded() public {
        usdc.mint(bob, 500 * 1e6);
        vm.startPrank(bob);
        usdc.transfer(address(pair), 500 * 1e6);

        // Requesting 5 AETH when 500 USDC only buys ~0.16 AETH -> should revert InvalidK
        vm.expectRevert(AetherisPair.InvalidK.selector);
        pair.swap(5 ether, 0, bob, "");
        vm.stopPrank();
    }

    function test_Invariant_K_NeverDecreases(uint256 swapAmount) public {
        vm.assume(swapAmount > 1000 && swapAmount < 50_000 * 1e6);
        (uint112 r0Before, uint112 r1Before,) = pair.getReserves();
        uint256 kBefore = uint256(r0Before) * r1Before;

        usdc.mint(alice, swapAmount);
        vm.startPrank(alice);
        usdc.transfer(address(pair), swapAmount);

        // Calculate maximum safe output
        uint256 amountInWithFee = swapAmount * 997;
        uint256 outAmount = (amountInWithFee * r0Before) / ((r1Before * 1000) + amountInWithFee);

        pair.swap(outAmount, 0, alice, "");
        vm.stopPrank();

        (uint112 r0After, uint112 r1After,) = pair.getReserves();
        uint256 kAfter = uint256(r0After) * r1After;

        // Formal Invariant: kAfter >= kBefore due to 0.3% protocol fee retention
        assertGe(kAfter, kBefore);
    }
}`
  },
  {
    name: 'AetherisLending.t.sol',
    path: 'test/foundry/AetherisLending.t.sol',
    category: 'tests',
    description: 'Foundry Forge test suite: Lending LTV limits, kinked interest rate accrual, and liquidations.',
    language: 'solidity',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AetherisLendingPool} from "../../contracts/lending/AetherisLendingPool.sol";
import {MockOracle} from "../mocks/MockOracle.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract AetherisLendingTest is Test {
    AetherisLendingPool pool;
    MockOracle oracle;
    MockERC20 weth;
    MockERC20 usdc;

    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    function setUp() public {
        oracle = new MockOracle();
        pool = new AetherisLendingPool(address(oracle));
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Set Prices: WETH = $3,000, USDC = $1.00
        oracle.setPrice(address(weth), 3000 ether);
        oracle.setPrice(address(usdc), 1 ether);

        // Liquidity provider supplies 1,000,000 USDC
        usdc.mint(address(this), 1_000_000 * 1e6);
        usdc.approve(address(pool), 1_000_000 * 1e6);
        pool.deposit(address(usdc), 1_000_000 * 1e6);
    }

    function test_DepositAndBorrowWithinLTV() public {
        // Bob supplies 10 WETH ($30,000 value). Max borrow at 75% LTV = $22,500 USDC
        weth.mint(bob, 10 ether);

        vm.startPrank(bob);
        weth.approve(address(pool), 10 ether);
        pool.deposit(address(weth), 10 ether);

        // Bob borrows 20,000 USDC (66.6% LTV -> Health Factor ≈ 1.20)
        pool.borrow(address(usdc), 20_000 * 1e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(bob), 20_000 * 1e6);
        assertGt(pool.calculateHealthFactor(bob), 1 ether);
    }

    function test_LiquidateUndercollateralizedPosition() public {
        // 1. Bob sets up position
        weth.mint(bob, 10 ether);
        vm.startPrank(bob);
        weth.approve(address(pool), 10 ether);
        pool.deposit(address(weth), 10 ether);
        pool.borrow(address(usdc), 22_000 * 1e6); // Close to 75% limit
        vm.stopPrank();

        // 2. Market Drop: WETH drops from $3,000 to $2,400 (-20%)
        // Bob's collateral = $24,000, Liquidation limit (80%) = $19,200 < Debt $22,000 -> Health Factor < 1.0!
        oracle.setPrice(address(weth), 2400 ether);
        assertLt(pool.calculateHealthFactor(bob), 1 ether);

        // 3. Charlie liquidates 10,000 USDC of debt
        usdc.mint(charlie, 10_000 * 1e6);
        vm.startPrank(charlie);
        usdc.approve(address(pool), 10_000 * 1e6);
        pool.liquidate(bob, address(weth), address(usdc), 10_000 * 1e6);
        vm.stopPrank();

        // Charlie gets 10,000 * 1.05 / 2,400 = 4.375 WETH with 5% liquidation bonus
        assertGt(weth.balanceOf(charlie), 4 ether);
    }
}`
  }
];
