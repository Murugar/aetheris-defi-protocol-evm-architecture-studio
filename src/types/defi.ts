export type SupportedTokenSymbol = 'ETH' | 'USDC' | 'AETH' | 'WBTC' | 'DAI';

export interface Token {
  symbol: SupportedTokenSymbol;
  name: string;
  decimals: number;
  iconColor: string;
  priceUsd: number;
  address: string;
}

export interface LiquidityPool {
  id: string;
  pairAddress: string;
  token0: Token;
  token1: Token;
  reserve0: number; // e.g. 100 ETH
  reserve1: number; // e.g. 300,000 USDC
  totalLpShares: number;
  feePercent: number; // e.g. 0.3%
  volume24h: number;
  feeApr: number;
  userLpShares: number;
}

export interface LendingAsset {
  token: Token;
  totalSupply: number;
  totalBorrowed: number;
  supplyApy: number;
  borrowApy: number;
  utilizationRate: number;
  collateralFactor: number; // e.g. 0.75 (75% LTV)
  liquidationThreshold: number; // e.g. 0.80 (80%)
  liquidationBonus: number; // e.g. 0.05 (5%)
  userSupplied: number;
  userBorrowed: number;
  isCollateralEnabled: boolean;
}

export interface StakingPool {
  id: string;
  name: string;
  stakingToken: Token;
  rewardToken: Token;
  totalStaked: number;
  rewardRatePerSecond: number;
  periodFinish: number;
  baseApr: number;
  userStaked: number;
  userLockDurationDays: number;
  userEarned: number;
}

export interface YieldVault {
  id: string;
  name: string;
  assetToken: Token;
  totalAssets: number;
  totalShares: number;
  sharePrice: number; // totalAssets / totalShares
  apy: number;
  userShares: number;
  strategyName: string;
}

export interface AccountState {
  address: string;
  label: string;
  role: 'Trader & LP' | 'Borrower' | 'Liquidator' | 'Protocol Governance';
  balances: Record<SupportedTokenSymbol, number>;
}

export interface EvmTransaction {
  id: string;
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  action: string;
  gasUsed: number;
  status: 'success' | 'reverted';
  details: string;
  eventsEmitted: Array<{
    name: string;
    contract: string;
    params: Record<string, string | number>;
  }>;
}

export interface FoundryTestCase {
  id: string;
  contractName: string;
  functionName: string;
  description: string;
  category: 'unit' | 'integration' | 'invariant' | 'fuzz';
  expectedGas: number;
  status: 'idle' | 'running' | 'passed' | 'failed';
  gasUsed?: number;
  executionLogs?: string[];
  traces?: Array<{
    depth: number;
    call: string;
    gas: number;
    returnValue?: string;
  }>;
}
