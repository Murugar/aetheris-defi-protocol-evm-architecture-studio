import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Shield,
  Coins,
  Repeat,
  Zap,
  Cpu,
  Landmark,
  Scale,
  Sparkles,
  FileCode2,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<'swap' | 'lending' | 'flash' | 'vault'>('swap');

  const scenarios = [
    {
      id: 'swap' as const,
      title: '01. Constant Product AMM Swap & Fee Routing',
      subtitle: 'x * y = k Invariant with 0.25% LP / 0.05% Protocol Fee Partition',
      steps: [
        'User calls AetherisRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)',
        'Router transfers input tokens from Trader to the deterministic AetherisPair address',
        'AetherisPair calculates output tokens using (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)',
        'Pair transfers output tokens directly to Trader recipient address',
        'Pair verifies invariant: (balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * 1000^2), updates TWAP accumulators, and emits Swap event',
      ],
    },
    {
      id: 'lending' as const,
      title: '02. Collateralized Borrow & Kinked Interest Accrual',
      subtitle: 'Multi-collateral jump rate model with real-time solvency check',
      steps: [
        'Borrower deposits collateral (e.g. 10 ETH = $32,000) into AetherisLendingPool',
        'Pool validates deposit, increments totalSupplied, and mints interest-bearing internal shares',
        'Borrower initiates borrow (e.g. 20,000 USDC). Pool queries IPriceOracle to compute aggregate borrowing capacity at 75% LTV',
        'Pool computes utilization U = Borrows / Supply. If U <= 80%, R = 2% + (U/80%) * 4%. If U > 80%, jump rate kicks in up to 66%',
        'Borrower receives USDC. Position is active with Health Factor HF = (Collateral * 80%) / Debt = 1.28 (> 1.0)',
      ],
    },
    {
      id: 'flash' as const,
      title: '03. Flash Swap Arbitrage & Reentrancy-Safe Callback',
      subtitle: 'Zero-capital flash liquidity execution with IAetherisCallee',
      steps: [
        'Arbitrageur invokes AetherisPair.swap(amount0Out, amount1Out, to, bytes data) passing non-empty data payload',
        'Pair transfers requested output tokens to Arbitrageur contract BEFORE taking any payment',
        'Pair invokes IAetherisCallee(to).aetherisCall(sender, amount0Out, amount1Out, data)',
        'Arbitrageur executes external profitable trade on secondary DEX or lending liquidation',
        'Arbitrageur contract transfers principal + 0.3% fee back to AetherisPair',
        'Pair re-checks balance reserves; if invariant is satisfied, tx succeeds; otherwise entire execution reverts atomically',
      ],
    },
    {
      id: 'vault' as const,
      title: '04. ERC-4626 Tokenized Vault & Inflation Protection',
      subtitle: 'Virtual shares and virtual assets math preventing first-depositor griefing',
      steps: [
        'User deposits assets into AetherisVaultERC4626',
        'Standard conversion shares = assets * (totalSupply + 10^3) / (totalAssets + 1)',
        'The +10^3 (1,000 virtual shares) offset mathematically neutralizes frontrunning share manipulation attacks',
        'Strategist runs harvestYield() injecting earned rewards directly into the vault balance',
        'totalAssets increases without minting new shares, monotonically raising the price per share for all depositors',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Protocol Smart Contract Architecture</h1>
        <p className="text-xs text-slate-400 mt-1">
          System topology, mathematical invariants, and on-chain token flow execution sequence.
        </p>
      </div>

      {/* Visual Contract Topology Map */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">On-Chain System Architecture Map</h2>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/60">
            EVM Bytecode Compliant
          </span>
        </div>

        {/* Modular Topology Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* User Entry Points */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>01. User & Integrations</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-white">Traders & Arbitrageurs</div>
                <div className="text-[11px] text-slate-400">Swaps, flash loans, routing</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-white">Liquidity Providers</div>
                <div className="text-[11px] text-slate-400">Mint / Burn LP tokens</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-white">Liquidators</div>
                <div className="text-[11px] text-slate-400">Seize collateral + 5% bonus</div>
              </div>
            </div>
          </div>

          {/* Core Contracts */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>02. Core DeFi Contracts</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-emerald-300">AetherisRouter.sol</div>
                <div className="text-[11px] text-slate-400">Slippage & multi-hop paths</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-emerald-300">AetherisPair.sol</div>
                <div className="text-[11px] text-slate-400">x*y=k pool, flash swaps, TWAP</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-emerald-300">AetherisLendingPool.sol</div>
                <div className="text-[11px] text-slate-400">Kinked rates, health factors</div>
              </div>
            </div>
          </div>

          {/* Yield & Settlement */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>03. Yield & Settlement</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-amber-300">AetherisVaultERC4626.sol</div>
                <div className="text-[11px] text-slate-400">EIP-4626 yield tokenization</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-amber-300">AetherisStakingRewards.sol</div>
                <div className="text-[11px] text-slate-400">Synthetix rate accumulator</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-semibold text-amber-300">Protocol Treasury DAO</div>
                <div className="text-[11px] text-slate-400">0.05% protocol fee retention</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Token Flow Execution Sequences */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Token Flow Execution Sequences</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Interactive Flow Inspector</span>
        </div>

        {/* Tab Selectors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedScenario === s.id
                  ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs truncate">{s.title.split('.')[1]}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{s.id.toUpperCase()} Flow</div>
            </button>
          ))}
        </div>

        {/* Sequence Display */}
        {(() => {
          const current = scenarios.find((s) => s.id === selectedScenario)!;
          return (
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">{current.title}</h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">{current.subtitle}</p>
              </div>

              <div className="space-y-3 pt-2">
                {current.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <p className="text-slate-300 font-mono leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Core Protocol Invariants Mathematical Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AMM Invariant */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 font-mono">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
            <Scale className="w-4 h-4" />
            <span>Constant Product Invariant</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200">
            <code>(R0 + Δ0 · 0.997) · (R1 - Δ1) ≥ R0 · R1</code>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Guarantees the liquidity pool invariant K cannot decrease during any swap transaction. The 30 bps fee accumulates into the reserves, raising K monotonically over time.
          </p>
        </div>

        {/* Lending Health Factor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 font-mono">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <Shield className="w-4 h-4" />
            <span>Health Factor Solvency Invariant</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200">
            <code>HF = Σ(Collateral_i · Price_i · LT_i) / Σ(Debt_j · Price_j) ≥ 1.0</code>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Ensures that the discounted liquidation value of deposited collateral exceeds 100% of outstanding borrowed debt. If HF &lt; 1.0, any third-party liquidator can claim the 5% bonus.
          </p>
        </div>
      </div>
    </div>
  );
};
