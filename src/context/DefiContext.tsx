import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AccountState,
  EvmTransaction,
  FoundryTestCase,
  LendingAsset,
  LiquidityPool,
  StakingPool,
  SupportedTokenSymbol,
  Token,
  YieldVault,
} from '../types/defi';
import {
  FOUNDRY_TEST_CASES,
  INITIAL_ACCOUNTS,
  INITIAL_LENDING_ASSETS,
  INITIAL_POOLS,
  INITIAL_STAKING_POOL,
  INITIAL_TRANSACTIONS,
  INITIAL_YIELD_VAULT,
  SUPPORTED_TOKENS,
  generateTxHash,
} from '../services/evmSimulator';

interface DefiContextType {
  // Accounts & Network
  accounts: AccountState[];
  currentAccount: AccountState;
  setCurrentAccountAddress: (addr: string) => void;
  tokens: Record<SupportedTokenSymbol, Token>;
  blockNumber: number;
  blockTimestamp: number;
  advanceTime: (seconds: number) => void;
  faucetMint: (symbol: SupportedTokenSymbol, amount: number) => void;

  // Oracle Price Simulation
  updateTokenPrice: (symbol: SupportedTokenSymbol, newPrice: number) => void;
  resetPrices: () => void;

  // AMM DEX
  pools: LiquidityPool[];
  executeSwap: (
    poolId: string,
    tokenInSymbol: SupportedTokenSymbol,
    amountIn: number,
    slippageTolerancePercent: number
  ) => { success: boolean; amountOut: number; message: string };
  addLiquidity: (
    poolId: string,
    amount0: number,
    amount1: number
  ) => { success: boolean; lpTokensMinted: number; message: string };
  removeLiquidity: (
    poolId: string,
    lpShares: number
  ) => { success: boolean; amount0: number; amount1: number; message: string };

  // Lending Market
  lendingAssets: LendingAsset[];
  supplyCollateral: (assetSymbol: SupportedTokenSymbol, amount: number) => { success: boolean; message: string };
  borrowAsset: (assetSymbol: SupportedTokenSymbol, amount: number) => { success: boolean; message: string };
  repayAsset: (assetSymbol: SupportedTokenSymbol, amount: number) => { success: boolean; message: string };
  liquidatePosition: (
    borrowerAddress: string,
    collateralSymbol: SupportedTokenSymbol,
    debtSymbol: SupportedTokenSymbol,
    debtAmountToCover: number
  ) => { success: boolean; collateralSeized: number; message: string };
  calculateAccountHealthFactor: (account: AccountState) => {
    totalCollateralUsd: number;
    totalDebtUsd: number;
    borrowLimitUsd: number;
    liquidationThresholdUsd: number;
    healthFactor: number;
  };

  // Staking & Vaults
  stakingPool: StakingPool;
  stakeTokens: (amount: number, lockDays: number) => { success: boolean; message: string };
  unstakeTokens: () => { success: boolean; message: string };
  claimStakingRewards: () => { success: boolean; rewardClaimed: number; message: string };

  yieldVault: YieldVault;
  depositVault: (amountAssets: number) => { success: boolean; sharesMinted: number; message: string };
  redeemVault: (amountShares: number) => { success: boolean; assetsRedeemed: number; message: string };

  // Transactions & Block Explorer
  transactions: EvmTransaction[];

  // Foundry Tests Runner
  testCases: FoundryTestCase[];
  runAllTests: () => Promise<void>;
  runSingleTest: (testId: string) => Promise<void>;
  isTestingRunning: boolean;
}

const DefiContext = createContext<DefiContextType | null>(null);

export const DefiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<AccountState[]>(INITIAL_ACCOUNTS);
  const [currentAccountAddress, setCurrentAccountAddress] = useState<string>(INITIAL_ACCOUNTS[0].address);
  const [tokens, setTokens] = useState<Record<SupportedTokenSymbol, Token>>(SUPPORTED_TOKENS);
  const [blockNumber, setBlockNumber] = useState<number>(19482912);
  const [blockTimestamp, setBlockTimestamp] = useState<number>(Math.floor(Date.now() / 1000));
  const [pools, setPools] = useState<LiquidityPool[]>(INITIAL_POOLS);
  const [lendingAssets, setLendingAssets] = useState<LendingAsset[]>(INITIAL_LENDING_ASSETS);
  const [stakingPool, setStakingPool] = useState<StakingPool>(INITIAL_STAKING_POOL);
  const [yieldVault, setYieldVault] = useState<YieldVault>(INITIAL_YIELD_VAULT);
  const [transactions, setTransactions] = useState<EvmTransaction[]>(INITIAL_TRANSACTIONS);
  const [testCases, setTestCases] = useState<FoundryTestCase[]>(FOUNDRY_TEST_CASES);
  const [isTestingRunning, setIsTestingRunning] = useState<boolean>(false);

  const currentAccount = accounts.find((a) => a.address.toLowerCase() === currentAccountAddress.toLowerCase()) || accounts[0];

  const addTx = (tx: Omit<EvmTransaction, 'id' | 'hash' | 'blockNumber' | 'timestamp'>) => {
    const newTx: EvmTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hash: generateTxHash(),
      blockNumber: blockNumber + 1,
      timestamp: blockTimestamp,
      ...tx,
    };
    setTransactions((prev) => [newTx, ...prev]);
    setBlockNumber((b) => b + 1);
    return newTx;
  };

  // Faucet
  const faucetMint = (symbol: SupportedTokenSymbol, amount: number) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [symbol]: (acc.balances[symbol] || 0) + amount,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: '0x0000000000000000000000000000000000000000',
      to: currentAccount.address,
      action: `TestnetFaucet.mint(${symbol})`,
      gasUsed: 54200,
      status: 'success',
      details: `Minted ${amount.toLocaleString()} ${symbol} to ${currentAccount.label}`,
      eventsEmitted: [
        {
          name: 'Transfer',
          contract: `${symbol} Token`,
          params: { from: '0x0', to: currentAccount.address, amount },
        },
      ],
    });
  };

  // Oracle Price Simulation
  const updateTokenPrice = (symbol: SupportedTokenSymbol, newPrice: number) => {
    setTokens((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        priceUsd: Math.max(0.0001, newPrice),
      },
    }));
  };

  const resetPrices = () => {
    setTokens(SUPPORTED_TOKENS);
  };

  // Time machine: advances block timestamp and calculates yield & interest accrual
  const advanceTime = (seconds: number) => {
    const blocksPassed = Math.floor(seconds / 12);
    setBlockNumber((prev) => prev + blocksPassed);
    setBlockTimestamp((prev) => prev + seconds);

    // 1. Accrue Staking Rewards
    if (stakingPool.userStaked > 0) {
      // Calculate multiplier: 90 days = 2.0x
      const multiplier =
        stakingPool.userLockDurationDays >= 365
          ? 2.5
          : stakingPool.userLockDurationDays >= 90
          ? 2.0
          : stakingPool.userLockDurationDays >= 30
          ? 1.5
          : 1.0;

      const userStakeShare = (stakingPool.userStaked * multiplier) / stakingPool.totalStaked;
      const additionalReward = stakingPool.rewardRatePerSecond * seconds * userStakeShare;

      setStakingPool((prev) => ({
        ...prev,
        userEarned: Number((prev.userEarned + additionalReward).toFixed(4)),
      }));
    }

    // 2. Accrue Yield Vault Share Appreciation
    const vaultReturnRate = (yieldVault.apy / 100) * (seconds / (365 * 86400));
    setYieldVault((prev) => {
      const newSharePrice = Number((prev.sharePrice * (1 + vaultReturnRate)).toFixed(5));
      const newTotalAssets = Number((prev.totalAssets * (1 + vaultReturnRate)).toFixed(2));
      return {
        ...prev,
        sharePrice: newSharePrice,
        totalAssets: newTotalAssets,
      };
    });

    // 3. Accrue Lending Debt Interest
    setLendingAssets((prev) =>
      prev.map((asset) => {
        const annualInterest = (asset.borrowApy / 100) * (seconds / (365 * 86400));
        const userInterest = asset.userBorrowed * annualInterest;
        return {
          ...asset,
          userBorrowed: Number((asset.userBorrowed + userInterest).toFixed(4)),
          totalBorrowed: Number((asset.totalBorrowed + asset.totalBorrowed * annualInterest).toFixed(2)),
        };
      })
    );
  };

  // AMM Swap execution: x * y = k with 0.3% fee
  const executeSwap = (
    poolId: string,
    tokenInSymbol: SupportedTokenSymbol,
    amountIn: number,
    slippageTolerancePercent: number
  ) => {
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) return { success: false, amountOut: 0, message: 'Pool not found' };

    const isToken0In = pool.token0.symbol === tokenInSymbol;
    const tokenIn = isToken0In ? pool.token0 : pool.token1;
    const tokenOut = isToken0In ? pool.token1 : pool.token0;
    const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;

    // Check user balance
    const userBalance = currentAccount.balances[tokenInSymbol] || 0;
    if (userBalance < amountIn) {
      return { success: false, amountOut: 0, message: `Insufficient ${tokenInSymbol} balance` };
    }

    // Constant product formula with 0.3% fee:
    // amountInWithFee = amountIn * 997
    // amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee)
    const amountInWithFee = amountIn * 997;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000 + amountInWithFee;
    const amountOut = numerator / denominator;

    // Slippage check
    const idealPrice = reserveOut / reserveIn;
    const expectedIdealOut = amountIn * idealPrice;
    const minAmountOut = expectedIdealOut * (1 - slippageTolerancePercent / 100);

    if (amountOut < minAmountOut) {
      addTx({
        from: currentAccount.address,
        to: pool.pairAddress,
        action: 'AetherisRouter.swapExactTokensForTokens',
        gasUsed: 42100,
        status: 'reverted',
        details: `Swap reverted: Slippage limit exceeded (Expected min ${minAmountOut.toFixed(4)}, got ${amountOut.toFixed(4)})`,
        eventsEmitted: [],
      });
      return {
        success: false,
        amountOut: 0,
        message: `Slippage exceeded: Received ${amountOut.toFixed(4)} ${tokenOut.symbol}, minimum requested was ${minAmountOut.toFixed(4)}`,
      };
    }

    // Update pool reserves
    const newReserveIn = reserveIn + amountIn;
    const newReserveOut = reserveOut - amountOut;

    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId) {
          return {
            ...p,
            reserve0: isToken0In ? newReserveIn : newReserveOut,
            reserve1: isToken0In ? newReserveOut : newReserveIn,
            volume24h: p.volume24h + amountIn * (tokens[tokenInSymbol]?.priceUsd || 1),
          };
        }
        return p;
      })
    );

    // Update user balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [tokenIn.symbol]: acc.balances[tokenIn.symbol] - amountIn,
              [tokenOut.symbol]: (acc.balances[tokenOut.symbol] || 0) + amountOut,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: currentAccount.address,
      to: pool.pairAddress,
      action: 'AetherisRouter.swapExactTokensForTokens',
      gasUsed: 118420,
      status: 'success',
      details: `Swapped ${amountIn.toFixed(4)} ${tokenIn.symbol} for ${amountOut.toFixed(4)} ${tokenOut.symbol} via AetherisPair`,
      eventsEmitted: [
        {
          name: 'Swap',
          contract: `AetherisPair (${pool.token0.symbol}/${pool.token1.symbol})`,
          params: {
            amountIn,
            amountOut,
            sender: currentAccount.address,
            reserve0After: isToken0In ? newReserveIn : newReserveOut,
            reserve1After: isToken0In ? newReserveOut : newReserveIn,
          },
        },
      ],
    });

    return {
      success: true,
      amountOut,
      message: `Successfully swapped ${amountIn.toFixed(4)} ${tokenIn.symbol} for ${amountOut.toFixed(4)} ${tokenOut.symbol}`,
    };
  };

  // Add Liquidity
  const addLiquidity = (poolId: string, amount0: number, amount1: number) => {
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) return { success: false, lpTokensMinted: 0, message: 'Pool not found' };

    const bal0 = currentAccount.balances[pool.token0.symbol] || 0;
    const bal1 = currentAccount.balances[pool.token1.symbol] || 0;

    if (bal0 < amount0 || bal1 < amount1) {
      return { success: false, lpTokensMinted: 0, message: 'Insufficient balance to add liquidity' };
    }

    // Uniswap V2 LP mint math: min(amount0/reserve0, amount1/reserve1) * totalLpShares
    const lpMinted = Math.min((amount0 / pool.reserve0) * pool.totalLpShares, (amount1 / pool.reserve1) * pool.totalLpShares);

    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId) {
          return {
            ...p,
            reserve0: p.reserve0 + amount0,
            reserve1: p.reserve1 + amount1,
            totalLpShares: p.totalLpShares + lpMinted,
            userLpShares: p.userLpShares + lpMinted,
          };
        }
        return p;
      })
    );

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [pool.token0.symbol]: acc.balances[pool.token0.symbol] - amount0,
              [pool.token1.symbol]: acc.balances[pool.token1.symbol] - amount1,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: currentAccount.address,
      to: pool.pairAddress,
      action: 'AetherisRouter.addLiquidity',
      gasUsed: 148200,
      status: 'success',
      details: `Added ${amount0.toFixed(4)} ${pool.token0.symbol} + ${amount1.toFixed(2)} ${pool.token1.symbol}. Minted ${lpMinted.toFixed(2)} LP shares`,
      eventsEmitted: [
        {
          name: 'Mint',
          contract: `AetherisPair (${pool.token0.symbol}/${pool.token1.symbol})`,
          params: { amount0, amount1, liquidity: lpMinted, to: currentAccount.address },
        },
      ],
    });

    return {
      success: true,
      lpTokensMinted: lpMinted,
      message: `Added liquidity! Minted ${lpMinted.toFixed(2)} LP shares`,
    };
  };

  // Remove Liquidity
  const removeLiquidity = (poolId: string, lpShares: number) => {
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) return { success: false, amount0: 0, amount1: 0, message: 'Pool not found' };

    if (pool.userLpShares < lpShares) {
      return { success: false, amount0: 0, amount1: 0, message: 'Insufficient LP shares' };
    }

    const shareRatio = lpShares / pool.totalLpShares;
    const amount0 = shareRatio * pool.reserve0;
    const amount1 = shareRatio * pool.reserve1;

    setPools((prev) =>
      prev.map((p) => {
        if (p.id === poolId) {
          return {
            ...p,
            reserve0: p.reserve0 - amount0,
            reserve1: p.reserve1 - amount1,
            totalLpShares: p.totalLpShares - lpShares,
            userLpShares: p.userLpShares - lpShares,
          };
        }
        return p;
      })
    );

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [pool.token0.symbol]: (acc.balances[pool.token0.symbol] || 0) + amount0,
              [pool.token1.symbol]: (acc.balances[pool.token1.symbol] || 0) + amount1,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: currentAccount.address,
      to: pool.pairAddress,
      action: 'AetherisRouter.removeLiquidity',
      gasUsed: 132000,
      status: 'success',
      details: `Burned ${lpShares.toFixed(2)} LP shares. Received ${amount0.toFixed(4)} ${pool.token0.symbol} + ${amount1.toFixed(2)} ${pool.token1.symbol}`,
      eventsEmitted: [
        {
          name: 'Burn',
          contract: `AetherisPair (${pool.token0.symbol}/${pool.token1.symbol})`,
          params: { amount0, amount1, liquidity: lpShares, to: currentAccount.address },
        },
      ],
    });

    return {
      success: true,
      amount0,
      amount1,
      message: `Withdrew ${amount0.toFixed(4)} ${pool.token0.symbol} and ${amount1.toFixed(2)} ${pool.token1.symbol}`,
    };
  };

  // Lending: calculate health factor
  const calculateAccountHealthFactor = (account: AccountState) => {
    let totalCollateralUsd = 0;
    let liquidationThresholdUsd = 0;
    let borrowLimitUsd = 0;
    let totalDebtUsd = 0;

    lendingAssets.forEach((asset) => {
      const price = tokens[asset.token.symbol]?.priceUsd || 1;
      // If user supplied
      if (asset.userSupplied > 0 && asset.isCollateralEnabled) {
        const valUsd = asset.userSupplied * price;
        totalCollateralUsd += valUsd;
        borrowLimitUsd += valUsd * asset.collateralFactor;
        liquidationThresholdUsd += valUsd * asset.liquidationThreshold;
      }
      if (asset.userBorrowed > 0) {
        totalDebtUsd += asset.userBorrowed * price;
      }
    });

    const healthFactor = totalDebtUsd === 0 ? 999 : liquidationThresholdUsd / totalDebtUsd;

    return {
      totalCollateralUsd,
      totalDebtUsd,
      borrowLimitUsd,
      liquidationThresholdUsd,
      healthFactor,
    };
  };

  // Lending: Supply Collateral
  const supplyCollateral = (assetSymbol: SupportedTokenSymbol, amount: number) => {
    const bal = currentAccount.balances[assetSymbol] || 0;
    if (bal < amount) return { success: false, message: `Insufficient ${assetSymbol} balance` };

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [assetSymbol]: acc.balances[assetSymbol] - amount,
            },
          };
        }
        return acc;
      })
    );

    setLendingAssets((prev) =>
      prev.map((a) => {
        if (a.token.symbol === assetSymbol) {
          return {
            ...a,
            totalSupply: a.totalSupply + amount,
            userSupplied: a.userSupplied + amount,
            isCollateralEnabled: true,
          };
        }
        return a;
      })
    );

    addTx({
      from: currentAccount.address,
      to: '0x9482038401928401928401928401928401928401',
      action: 'AetherisLendingPool.deposit',
      gasUsed: 92400,
      status: 'success',
      details: `Supplied ${amount.toLocaleString()} ${assetSymbol} as collateral`,
      eventsEmitted: [
        {
          name: 'Deposit',
          contract: 'AetherisLendingPool',
          params: { user: currentAccount.address, asset: assetSymbol, amount },
        },
      ],
    });

    return { success: true, message: `Supplied ${amount} ${assetSymbol} into lending pool!` };
  };

  // Lending: Borrow Asset
  const borrowAsset = (assetSymbol: SupportedTokenSymbol, amount: number) => {
    const asset = lendingAssets.find((a) => a.token.symbol === assetSymbol);
    if (!asset) return { success: false, message: 'Asset not found' };

    const tokenPrice = tokens[assetSymbol]?.priceUsd || 1;
    const additionalDebtUsd = amount * tokenPrice;

    const currentMetrics = calculateAccountHealthFactor(currentAccount);
    const newTotalDebtUsd = currentMetrics.totalDebtUsd + additionalDebtUsd;

    if (newTotalDebtUsd > currentMetrics.borrowLimitUsd) {
      return {
        success: false,
        message: `Exceeds max borrow limit! Max available borrow: $${Math.max(
          0,
          currentMetrics.borrowLimitUsd - currentMetrics.totalDebtUsd
        ).toFixed(2)} USD`,
      };
    }

    setLendingAssets((prev) =>
      prev.map((a) => {
        if (a.token.symbol === assetSymbol) {
          const newBorrowed = a.totalBorrowed + amount;
          const newUtil = newBorrowed / a.totalSupply;
          return {
            ...a,
            totalBorrowed: newBorrowed,
            userBorrowed: a.userBorrowed + amount,
            utilizationRate: newUtil,
          };
        }
        return a;
      })
    );

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [assetSymbol]: (acc.balances[assetSymbol] || 0) + amount,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: currentAccount.address,
      to: '0x9482038401928401928401928401928401928401',
      action: 'AetherisLendingPool.borrow',
      gasUsed: 128400,
      status: 'success',
      details: `Borrowed ${amount.toLocaleString()} ${assetSymbol} against collateral`,
      eventsEmitted: [
        {
          name: 'Borrow',
          contract: 'AetherisLendingPool',
          params: { user: currentAccount.address, asset: assetSymbol, amount },
        },
      ],
    });

    return { success: true, message: `Successfully borrowed ${amount} ${assetSymbol}!` };
  };

  // Lending: Repay Asset
  const repayAsset = (assetSymbol: SupportedTokenSymbol, amount: number) => {
    const bal = currentAccount.balances[assetSymbol] || 0;
    if (bal < amount) return { success: false, message: `Insufficient ${assetSymbol} to repay` };

    const asset = lendingAssets.find((a) => a.token.symbol === assetSymbol);
    if (!asset || asset.userBorrowed <= 0) return { success: false, message: 'No outstanding debt' };

    const repayAmount = Math.min(amount, asset.userBorrowed);

    setLendingAssets((prev) =>
      prev.map((a) => {
        if (a.token.symbol === assetSymbol) {
          const newTotal = Math.max(0, a.totalBorrowed - repayAmount);
          return {
            ...a,
            totalBorrowed: newTotal,
            userBorrowed: Math.max(0, a.userBorrowed - repayAmount),
            utilizationRate: newTotal / a.totalSupply,
          };
        }
        return a;
      })
    );

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [assetSymbol]: acc.balances[assetSymbol] - repayAmount,
            },
          };
        }
        return acc;
      })
    );

    addTx({
      from: currentAccount.address,
      to: '0x9482038401928401928401928401928401928401',
      action: 'AetherisLendingPool.repay',
      gasUsed: 89000,
      status: 'success',
      details: `Repaid ${repayAmount.toFixed(4)} ${assetSymbol} loan principal + accrued interest`,
      eventsEmitted: [
        {
          name: 'Repay',
          contract: 'AetherisLendingPool',
          params: { user: currentAccount.address, asset: assetSymbol, amount: repayAmount },
        },
      ],
    });

    return { success: true, message: `Repaid ${repayAmount} ${assetSymbol}!` };
  };

  // Lending: Liquidate Underwater Position (e.g. Charlie liquidates Bob)
  const liquidatePosition = (
    borrowerAddress: string,
    collateralSymbol: SupportedTokenSymbol,
    debtSymbol: SupportedTokenSymbol,
    debtAmountToCover: number
  ) => {
    const borrower = accounts.find((a) => a.address.toLowerCase() === borrowerAddress.toLowerCase());
    if (!borrower) return { success: false, collateralSeized: 0, message: 'Borrower not found' };

    const metrics = calculateAccountHealthFactor(borrower);
    if (metrics.healthFactor >= 1.0) {
      return {
        success: false,
        collateralSeized: 0,
        message: `Position is solvent! Health Factor is ${metrics.healthFactor.toFixed(2)} (>= 1.0). Cannot liquidate.`,
      };
    }

    const colPrice = tokens[collateralSymbol].priceUsd;
    const debtPrice = tokens[debtSymbol].priceUsd;
    const liquidationBonus = 1.05; // 5% bonus to liquidator

    // Collateral to seize = (debtToCover * debtPrice * 1.05) / collateralPrice
    const collateralSeized = (debtAmountToCover * debtPrice * liquidationBonus) / colPrice;

    // Check liquidator balance
    const liquidatorBal = currentAccount.balances[debtSymbol] || 0;
    if (liquidatorBal < debtAmountToCover) {
      return { success: false, collateralSeized: 0, message: `Liquidator lacks ${debtAmountToCover} ${debtSymbol}` };
    }

    // Transfer debt from liquidator
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [debtSymbol]: acc.balances[debtSymbol] - debtAmountToCover,
              [collateralSymbol]: (acc.balances[collateralSymbol] || 0) + collateralSeized,
            },
          };
        }
        return acc;
      })
    );

    // Reduce borrower's debt and collateral
    setLendingAssets((prev) =>
      prev.map((a) => {
        if (a.token.symbol === debtSymbol) {
          return {
            ...a,
            totalBorrowed: Math.max(0, a.totalBorrowed - debtAmountToCover),
            userBorrowed: Math.max(0, a.userBorrowed - debtAmountToCover),
          };
        }
        if (a.token.symbol === collateralSymbol) {
          return {
            ...a,
            totalSupply: Math.max(0, a.totalSupply - collateralSeized),
            userSupplied: Math.max(0, a.userSupplied - collateralSeized),
          };
        }
        return a;
      })
    );

    addTx({
      from: currentAccount.address,
      to: '0x9482038401928401928401928401928401928401',
      action: 'AetherisLendingPool.liquidate',
      gasUsed: 198400,
      status: 'success',
      details: `Liquidated position: Repaid ${debtAmountToCover} ${debtSymbol} debt, seized ${collateralSeized.toFixed(4)} ${collateralSymbol} (+5% bonus)`,
      eventsEmitted: [
        {
          name: 'Liquidate',
          contract: 'AetherisLendingPool',
          params: {
            liquidator: currentAccount.address,
            borrower: borrowerAddress,
            debtToCover: debtAmountToCover,
            collateralSeized,
          },
        },
      ],
    });

    return {
      success: true,
      collateralSeized,
      message: `Liquidation executed! Claimed ${collateralSeized.toFixed(4)} ${collateralSymbol} with 5% bonus!`,
    };
  };

  // Staking
  const stakeTokens = (amount: number, lockDays: number) => {
    const bal = currentAccount.balances.AETH || 0;
    if (bal < amount) return { success: false, message: 'Insufficient AETH to stake' };

    const multiplier = lockDays >= 365 ? 2.5 : lockDays >= 90 ? 2.0 : lockDays >= 30 ? 1.5 : 1.0;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              AETH: acc.balances.AETH - amount,
            },
          };
        }
        return acc;
      })
    );

    setStakingPool((prev) => ({
      ...prev,
      totalStaked: prev.totalStaked + amount,
      userStaked: prev.userStaked + amount,
      userLockDurationDays: lockDays,
    }));

    addTx({
      from: currentAccount.address,
      to: '0x1029384910293849102938491029384910293849',
      action: 'AetherisStakingRewards.stake',
      gasUsed: 121000,
      status: 'success',
      details: `Staked ${amount} AETH locked for ${lockDays} days (${multiplier}x multiplier)`,
      eventsEmitted: [
        {
          name: 'Staked',
          contract: 'AetherisStakingRewards',
          params: { user: currentAccount.address, amount, lockDays, multiplier },
        },
      ],
    });

    return { success: true, message: `Staked ${amount} AETH for ${lockDays} days with ${multiplier}x APY boost!` };
  };

  const unstakeTokens = () => {
    if (stakingPool.userStaked <= 0) return { success: false, message: 'No staked tokens' };

    const stakedAmount = stakingPool.userStaked;
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              AETH: acc.balances.AETH + stakedAmount,
            },
          };
        }
        return acc;
      })
    );

    setStakingPool((prev) => ({
      ...prev,
      totalStaked: prev.totalStaked - stakedAmount,
      userStaked: 0,
    }));

    addTx({
      from: currentAccount.address,
      to: '0x1029384910293849102938491029384910293849',
      action: 'AetherisStakingRewards.withdraw',
      gasUsed: 104200,
      status: 'success',
      details: `Unstaked ${stakedAmount} AETH back to wallet`,
      eventsEmitted: [
        {
          name: 'Withdrawn',
          contract: 'AetherisStakingRewards',
          params: { user: currentAccount.address, amount: stakedAmount },
        },
      ],
    });

    return { success: true, message: `Unstaked ${stakedAmount} AETH!` };
  };

  const claimStakingRewards = () => {
    const reward = stakingPool.userEarned;
    if (reward <= 0) return { success: false, rewardClaimed: 0, message: 'No rewards to claim yet' };

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              AETH: (acc.balances.AETH || 0) + reward,
            },
          };
        }
        return acc;
      })
    );

    setStakingPool((prev) => ({
      ...prev,
      userEarned: 0,
    }));

    addTx({
      from: currentAccount.address,
      to: '0x1029384910293849102938491029384910293849',
      action: 'AetherisStakingRewards.claimReward',
      gasUsed: 84000,
      status: 'success',
      details: `Claimed ${reward.toFixed(4)} AETH staking rewards`,
      eventsEmitted: [
        {
          name: 'RewardPaid',
          contract: 'AetherisStakingRewards',
          params: { user: currentAccount.address, reward },
        },
      ],
    });

    return { success: true, rewardClaimed: reward, message: `Claimed ${reward.toFixed(4)} AETH!` };
  };

  // ERC-4626 Vault
  const depositVault = (amountAssets: number) => {
    const bal = currentAccount.balances[yieldVault.assetToken.symbol] || 0;
    if (bal < amountAssets) return { success: false, sharesMinted: 0, message: `Insufficient ${yieldVault.assetToken.symbol}` };

    const sharesToMint = amountAssets / yieldVault.sharePrice;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [yieldVault.assetToken.symbol]: acc.balances[yieldVault.assetToken.symbol] - amountAssets,
            },
          };
        }
        return acc;
      })
    );

    setYieldVault((prev) => ({
      ...prev,
      totalAssets: prev.totalAssets + amountAssets,
      totalShares: prev.totalShares + sharesToMint,
      userShares: prev.userShares + sharesToMint,
    }));

    addTx({
      from: currentAccount.address,
      to: '0x7482038401928401928401928401928401928401',
      action: 'AetherisVaultERC4626.deposit',
      gasUsed: 110200,
      status: 'success',
      details: `Deposited ${amountAssets} USDC into ERC-4626 Vault. Minted ${sharesToMint.toFixed(2)} vault shares`,
      eventsEmitted: [
        {
          name: 'Deposit',
          contract: 'AetherisVaultERC4626',
          params: { caller: currentAccount.address, owner: currentAccount.address, assets: amountAssets, shares: sharesToMint },
        },
      ],
    });

    return { success: true, sharesMinted: sharesToMint, message: `Deposited ${amountAssets} USDC for ${sharesToMint.toFixed(2)} shares!` };
  };

  const redeemVault = (amountShares: number) => {
    if (yieldVault.userShares < amountShares) return { success: false, assetsRedeemed: 0, message: 'Insufficient shares' };

    const assetsToRedeem = amountShares * yieldVault.sharePrice;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.address === currentAccount.address) {
          return {
            ...acc,
            balances: {
              ...acc.balances,
              [yieldVault.assetToken.symbol]: (acc.balances[yieldVault.assetToken.symbol] || 0) + assetsToRedeem,
            },
          };
        }
        return acc;
      })
    );

    setYieldVault((prev) => ({
      ...prev,
      totalAssets: Math.max(0, prev.totalAssets - assetsToRedeem),
      totalShares: Math.max(0, prev.totalShares - amountShares),
      userShares: Math.max(0, prev.userShares - amountShares),
    }));

    addTx({
      from: currentAccount.address,
      to: '0x7482038401928401928401928401928401928401',
      action: 'AetherisVaultERC4626.redeem',
      gasUsed: 104500,
      status: 'success',
      details: `Redeemed ${amountShares.toFixed(2)} shares for ${assetsToRedeem.toFixed(2)} USDC`,
      eventsEmitted: [
        {
          name: 'Withdraw',
          contract: 'AetherisVaultERC4626',
          params: { caller: currentAccount.address, receiver: currentAccount.address, assets: assetsToRedeem, shares: amountShares },
        },
      ],
    });

    return { success: true, assetsRedeemed: assetsToRedeem, message: `Redeemed ${assetsToRedeem.toFixed(2)} USDC!` };
  };

  // Foundry Tests Runner
  const runSingleTest = async (testId: string) => {
    setTestCases((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'running' as const } : t))
    );

    await new Promise((res) => setTimeout(res, 400));

    setTestCases((prev) =>
      prev.map((t) => {
        if (t.id === testId) {
          const gasVariation = Math.floor(t.expectedGas * (0.98 + Math.random() * 0.04));
          return {
            ...t,
            status: 'passed' as const,
            gasUsed: gasVariation,
            executionLogs: [
              `[PASS] ${t.functionName}() (gas: ${gasVariation.toLocaleString()})`,
              `Logs: Invariant check asserted successfully`,
              `Emit event: StateTransitionVerified()`,
            ],
            traces: [
              { depth: 1, call: `${t.contractName}::setUp()`, gas: 24100 },
              { depth: 1, call: `${t.contractName}::${t.functionName}()`, gas: gasVariation - 24100, returnValue: '0x01' },
            ],
          };
        }
        return t;
      })
    );
  };

  const runAllTests = async () => {
    setIsTestingRunning(true);
    for (const t of testCases) {
      await runSingleTest(t.id);
      await new Promise((res) => setTimeout(res, 200));
    }
    setIsTestingRunning(false);
  };

  return (
    <DefiContext.Provider
      value={{
        accounts,
        currentAccount,
        setCurrentAccountAddress,
        tokens,
        blockNumber,
        blockTimestamp,
        advanceTime,
        faucetMint,
        updateTokenPrice,
        resetPrices,
        pools,
        executeSwap,
        addLiquidity,
        removeLiquidity,
        lendingAssets,
        supplyCollateral,
        borrowAsset,
        repayAsset,
        liquidatePosition,
        calculateAccountHealthFactor,
        stakingPool,
        stakeTokens,
        unstakeTokens,
        claimStakingRewards,
        yieldVault,
        depositVault,
        redeemVault,
        transactions,
        testCases,
        runAllTests,
        runSingleTest,
        isTestingRunning,
      }}
    >
      {children}
    </DefiContext.Provider>
  );
};

export const useDefi = () => {
  const context = useContext(DefiContext);
  if (!context) throw new Error('useDefi must be used within DefiProvider');
  return context;
};
