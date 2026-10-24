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

export const SUPPORTED_TOKENS: Record<SupportedTokenSymbol, Token> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    iconColor: '#627EEA',
    priceUsd: 3200,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconColor: '#2775CA',
    priceUsd: 1.0,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  AETH: {
    symbol: 'AETH',
    name: 'Aetheris Governance',
    decimals: 18,
    iconColor: '#06B6D4',
    priceUsd: 42.5,
    address: '0x7F26E6F7891230C8C7094017CAd20E279282363b',
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    iconColor: '#F7931A',
    priceUsd: 68400,
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    iconColor: '#F4B731',
    priceUsd: 1.0,
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
};

export const INITIAL_ACCOUNTS: AccountState[] = [
  {
    address: '0xa11ce729f270141697e3352723cf200ecf89a941',
    label: 'Alice',
    role: 'Trader & LP',
    balances: {
      ETH: 15.5,
      USDC: 25000,
      AETH: 850,
      WBTC: 0.75,
      DAI: 12000,
    },
  },
  {
    address: '0xb0b7410294104271829038104810294819028472',
    label: 'Bob',
    role: 'Borrower',
    balances: {
      ETH: 6.2,
      USDC: 4200,
      AETH: 120,
      WBTC: 0.1,
      DAI: 1500,
    },
  },
  {
    address: '0xc4a11e8471029481902847289102472948102841',
    label: 'Charlie',
    role: 'Liquidator',
    balances: {
      ETH: 45.0,
      USDC: 150000,
      AETH: 2400,
      WBTC: 2.5,
      DAI: 50000,
    },
  },
  {
    address: '0x000000000000000000000000000000000000dEaD',
    label: 'Treasury DAO',
    role: 'Protocol Governance',
    balances: {
      ETH: 500,
      USDC: 5000000,
      AETH: 250000,
      WBTC: 25,
      DAI: 2000000,
    },
  },
];

export const INITIAL_POOLS: LiquidityPool[] = [
  {
    id: 'aeth-usdc',
    pairAddress: '0x8849767676eB4DFFDAf872323eCbeA443B8d667c',
    token0: SUPPORTED_TOKENS.AETH,
    token1: SUPPORTED_TOKENS.USDC,
    reserve0: 120000, // 120k AETH
    reserve1: 5100000, // 5.1M USDC ($42.50 per AETH)
    totalLpShares: 782304,
    feePercent: 0.003, // 0.3%
    volume24h: 1845200,
    feeApr: 19.8,
    userLpShares: 1250,
  },
  {
    id: 'eth-usdc',
    pairAddress: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc',
    token0: SUPPORTED_TOKENS.ETH,
    token1: SUPPORTED_TOKENS.USDC,
    reserve0: 4500, // 4,500 ETH
    reserve1: 14400000, // 14.4M USDC ($3,200 per ETH)
    totalLpShares: 254558,
    feePercent: 0.003,
    volume24h: 8940000,
    feeApr: 14.2,
    userLpShares: 42,
  },
  {
    id: 'wbtc-eth',
    pairAddress: '0xBb2b8038a1640196FbE3e38399C36592343d7083',
    token0: SUPPORTED_TOKENS.WBTC,
    token1: SUPPORTED_TOKENS.ETH,
    reserve0: 180, // 180 WBTC ($12.3M)
    reserve1: 3847.5, // ~21.375 ETH per WBTC
    totalLpShares: 83219,
    feePercent: 0.003,
    volume24h: 3120000,
    feeApr: 11.5,
    userLpShares: 0,
  },
];

export const INITIAL_LENDING_ASSETS: LendingAsset[] = [
  {
    token: SUPPORTED_TOKENS.ETH,
    totalSupply: 3200,
    totalBorrowed: 2150,
    supplyApy: 3.4,
    borrowApy: 5.8,
    utilizationRate: 0.671,
    collateralFactor: 0.75, // 75% max borrow
    liquidationThreshold: 0.80, // 80% liquidation trigger
    liquidationBonus: 0.05, // 5% bonus to liquidator
    userSupplied: 5.0,
    userBorrowed: 0,
    isCollateralEnabled: true,
  },
  {
    token: SUPPORTED_TOKENS.USDC,
    totalSupply: 12500000,
    totalBorrowed: 9200000,
    supplyApy: 5.9,
    borrowApy: 8.7,
    utilizationRate: 0.736,
    collateralFactor: 0.80,
    liquidationThreshold: 0.85,
    liquidationBonus: 0.05,
    userSupplied: 2000,
    userBorrowed: 6500,
    isCollateralEnabled: true,
  },
  {
    token: SUPPORTED_TOKENS.WBTC,
    totalSupply: 120,
    totalBorrowed: 68,
    supplyApy: 2.1,
    borrowApy: 4.2,
    utilizationRate: 0.566,
    collateralFactor: 0.70,
    liquidationThreshold: 0.75,
    liquidationBonus: 0.05,
    userSupplied: 0,
    userBorrowed: 0,
    isCollateralEnabled: false,
  },
  {
    token: SUPPORTED_TOKENS.AETH,
    totalSupply: 250000,
    totalBorrowed: 95000,
    supplyApy: 8.2,
    borrowApy: 12.4,
    utilizationRate: 0.38,
    collateralFactor: 0.60,
    liquidationThreshold: 0.68,
    liquidationBonus: 0.08,
    userSupplied: 250,
    userBorrowed: 0,
    isCollateralEnabled: true,
  },
];

export const INITIAL_STAKING_POOL: StakingPool = {
  id: 'aeth-governance-staking',
  name: 'AETH Governance Yield Staking',
  stakingToken: SUPPORTED_TOKENS.AETH,
  rewardToken: SUPPORTED_TOKENS.AETH,
  totalStaked: 1420500,
  rewardRatePerSecond: 0.25,
  periodFinish: Date.now() + 86400 * 180 * 1000,
  baseApr: 24.5,
  userStaked: 400,
  userLockDurationDays: 90,
  userEarned: 14.82,
};

export const INITIAL_YIELD_VAULT: YieldVault = {
  id: 'aeth-erc4626-usdc-vault',
  name: 'Aetheris Automated Delta-Neutral Yield Vault',
  assetToken: SUPPORTED_TOKENS.USDC,
  totalAssets: 4850000,
  totalShares: 4474170,
  sharePrice: 1.084, // 1 Share = 1.084 USDC
  apy: 12.8,
  userShares: 1500,
  strategyName: 'Compound V3 + Uniswap V3 LP Arbitrage Farming',
};

export const INITIAL_TRANSACTIONS: EvmTransaction[] = [
  {
    id: 'tx-1',
    hash: '0x8f2a74c93e430fbc19c9e88b8e8f7a93a102948d82710384a8b7c9102830fca1',
    blockNumber: 19482910,
    timestamp: Date.now() - 3600000,
    from: '0xa11ce729f270141697e3352723cf200ecf89a941',
    to: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc',
    action: 'AetherisRouter.swapExactTokensForTokens',
    gasUsed: 124850,
    status: 'success',
    details: 'Swap 1.25 ETH for 4,000 USDC via Route [ETH -> USDC]',
    eventsEmitted: [
      {
        name: 'Swap',
        contract: 'AetherisPair (ETH/USDC)',
        params: { amount0In: 1.25, amount1Out: 4000, to: '0xa11ce...' },
      },
    ],
  },
  {
    id: 'tx-2',
    hash: '0x32194b810938fca8910284729104810293810481029381049281039841029482',
    blockNumber: 19482905,
    timestamp: Date.now() - 7200000,
    from: '0xa11ce729f270141697e3352723cf200ecf89a941',
    to: '0x9482038401928401928401928401928401928401',
    action: 'AetherisLendingPool.deposit',
    gasUsed: 98400,
    status: 'success',
    details: 'Supplied 5.0 ETH as collateral at 75% LTV',
    eventsEmitted: [
      {
        name: 'Deposit',
        contract: 'AetherisLendingPool',
        params: { asset: 'ETH', amount: 5.0, user: '0xa11ce...' },
      },
    ],
  },
  {
    id: 'tx-3',
    hash: '0x6291038491029481902847192847192847192847192847192847192847192847',
    blockNumber: 19482898,
    timestamp: Date.now() - 14400000,
    from: '0xa11ce729f270141697e3352723cf200ecf89a941',
    to: '0x1029384910293849102938491029384910293849',
    action: 'AetherisStakingRewards.stake',
    gasUsed: 142100,
    status: 'success',
    details: 'Staked 400 AETH with 90-day lock duration (2.0x Boost Multiplier)',
    eventsEmitted: [
      {
        name: 'Staked',
        contract: 'AetherisStakingRewards',
        params: { amount: 400, lockDays: 90, multiplier: 2.0 },
      },
    ],
  },
];

export const FOUNDRY_TEST_CASES: FoundryTestCase[] = [
  {
    id: 'test-1',
    contractName: 'AetherisPairTest',
    functionName: 'test_SwapConstantProductMath',
    description: 'Validates Uniswap V2 constant product formula x * y = k with 0.3% fee deduction',
    category: 'unit',
    expectedGas: 84319,
    status: 'idle',
  },
  {
    id: 'test-2',
    contractName: 'AetherisPairTest',
    functionName: 'test_RevertWhenSlippageExceeded',
    description: 'Verifies transaction reverts with InvalidK() or InsufficientOutputAmount() if slippage is exceeded',
    category: 'unit',
    expectedGas: 32180,
    status: 'idle',
  },
  {
    id: 'test-3',
    contractName: 'AetherisPairTest',
    functionName: 'test_Invariant_K_NeverDecreases',
    description: 'Foundry invariant fuzz testing: Asserts kAfter >= kBefore over 10,000 randomized swap inputs',
    category: 'invariant',
    expectedGas: 192840,
    status: 'idle',
  },
  {
    id: 'test-4',
    contractName: 'AetherisLendingTest',
    functionName: 'test_DepositAndBorrowWithinLTV',
    description: 'Tests collateral deposit, borrowing power calculation at 75% LTV, and health factor verification',
    category: 'integration',
    expectedGas: 154200,
    status: 'idle',
  },
  {
    id: 'test-5',
    contractName: 'AetherisLendingTest',
    functionName: 'test_LiquidateUndercollateralizedPosition',
    description: 'Simulates price shock, drops health factor < 1.0, and executes liquidation with 5% bonus to liquidator',
    category: 'integration',
    expectedGas: 218940,
    status: 'idle',
  },
  {
    id: 'test-6',
    contractName: 'AetherisVaultTest',
    functionName: 'test_ERC4626DepositRedeemVirtualDecimals',
    description: 'Verifies share-to-asset conversion math and confirms virtual offset prevents first-depositor inflation attacks',
    category: 'unit',
    expectedGas: 94100,
    status: 'idle',
  },
  {
    id: 'test-7',
    contractName: 'AetherisStakingTest',
    functionName: 'test_LockMultiplierYieldBoost',
    description: 'Validates Synthetix reward accumulator math and proves 90-day lock gets exactly 2.0x weight over standard stake',
    category: 'unit',
    expectedGas: 112500,
    status: 'idle',
  },
];

// Helper to generate keccak256-like hex string
export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
