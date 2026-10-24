import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import { LendingAsset, SupportedTokenSymbol } from '../../types/defi';
import {
  Landmark,
  Shield,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  X,
  Flame,
  Zap,
  TrendingDown,
} from 'lucide-react';

export const LendingView: React.FC = () => {
  const {
    currentAccount,
    accounts,
    lendingAssets,
    tokens,
    supplyCollateral,
    borrowAsset,
    repayAsset,
    liquidatePosition,
    calculateAccountHealthFactor,
    updateTokenPrice,
    resetPrices,
  } = useDefi();

  const [activeModal, setActiveModal] = useState<{
    type: 'supply' | 'borrow' | 'repay';
    asset: LendingAsset;
  } | null>(null);

  const [actionAmount, setActionAmount] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Health Factor Metrics
  const userMetrics = calculateAccountHealthFactor(currentAccount);

  // Find Bob (the designated borrower) for the liquidation simulation
  const bobAccount = accounts.find((a) => a.label === 'Bob') || accounts[1];
  const bobMetrics = calculateAccountHealthFactor(bobAccount);

  const handleAction = () => {
    if (!activeModal) return;
    const amount = parseFloat(actionAmount) || 0;
    if (amount <= 0) return;

    let res = { success: false, message: '' };
    if (activeModal.type === 'supply') {
      res = supplyCollateral(activeModal.asset.token.symbol, amount);
    } else if (activeModal.type === 'borrow') {
      res = borrowAsset(activeModal.asset.token.symbol, amount);
    } else if (activeModal.type === 'repay') {
      res = repayAsset(activeModal.asset.token.symbol, amount);
    }

    if (res.success) {
      setToast({ type: 'success', text: res.message });
      setActiveModal(null);
      setActionAmount('');
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleExecuteLiquidation = () => {
    // Liquidate Bob's debt: Repay USDC debt, seize ETH collateral
    const res = liquidatePosition(bobAccount.address, 'ETH', 'USDC', 3000);
    if (res.success) {
      setToast({ type: 'success', text: res.message });
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const getHealthFactorColor = (hf: number) => {
    if (hf > 1.8) return 'text-emerald-400';
    if (hf >= 1.2) return 'text-amber-400';
    return 'text-rose-400 font-bold';
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Algorithmic Lending & Money Market</h1>
          <p className="text-xs text-slate-400 mt-1">
            Over-collateralized borrowing powered by dynamic kinked interest rate curves and automated liquidations.
          </p>
        </div>

        {/* User Lending Overview Card */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Collateral</div>
            <div className="font-bold text-white tabular-nums">${userMetrics.totalCollateralUsd.toFixed(2)}</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Borrowed</div>
            <div className="font-bold text-slate-200 tabular-nums">${userMetrics.totalDebtUsd.toFixed(2)}</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Health Factor</div>
            <div className={`font-bold tabular-nums ${getHealthFactorColor(userMetrics.healthFactor)}`}>
              {userMetrics.healthFactor >= 999 ? '∞' : userMetrics.healthFactor.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2 text-xs ${
            toast.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
              : 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Markets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Lending & Borrowing Markets</span>
          <span className="text-xs text-slate-400 font-mono">Collateral Factor: 75% | Liquidation: 80%</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-3.5">Asset</th>
                <th className="px-6 py-3.5 text-right">Supply APY</th>
                <th className="px-6 py-3.5 text-right">Borrow APY</th>
                <th className="px-6 py-3.5 text-right">Utilization</th>
                <th className="px-6 py-3.5 text-right">Your Supplied</th>
                <th className="px-6 py-3.5 text-right">Your Borrowed</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {lendingAssets.map((asset) => {
                const price = tokens[asset.token.symbol]?.priceUsd || 1;
                return (
                  <tr key={asset.token.symbol} className="hover:bg-slate-850/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                          style={{ backgroundColor: asset.token.iconColor }}
                        >
                          {asset.token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{asset.token.symbol}</div>
                          <div className="text-[11px] text-slate-500 font-mono">${price.toLocaleString()} USD</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold tabular-nums">
                      +{asset.supplyApy.toFixed(2)}%
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-amber-400 font-bold tabular-nums">
                      {asset.borrowApy.toFixed(2)}%
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      <div className="text-slate-200 tabular-nums">{(asset.utilizationRate * 100).toFixed(1)}%</div>
                      <div className="w-20 bg-slate-800 rounded-full h-1.5 ml-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            asset.utilizationRate > 0.8 ? 'bg-rose-500' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, asset.utilizationRate * 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      <div className="font-semibold text-slate-200 tabular-nums">
                        {asset.userSupplied.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ${(asset.userSupplied * price).toFixed(2)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      <div className="font-semibold text-slate-200 tabular-nums">
                        {asset.userBorrowed.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ${(asset.userBorrowed * price).toFixed(2)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setActiveModal({ type: 'supply', asset });
                            setActionAmount('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40 transition-colors"
                        >
                          Supply
                        </button>

                        <button
                          onClick={() => {
                            setActiveModal({ type: 'borrow', asset });
                            setActionAmount('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
                        >
                          Borrow
                        </button>

                        {asset.userBorrowed > 0 && (
                          <button
                            onClick={() => {
                              setActiveModal({ type: 'repay', asset });
                              setActionAmount(asset.userBorrowed.toString());
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            Repay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Liquidation Arena & Oracle Price Shock Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Liquidation Arena & Oracle Stress Simulator</h2>
              <p className="text-xs text-slate-400">
                Simulate flash market crashes. When borrower Health Factor falls &lt; 1.0, execute on-chain liquidation!
              </p>
            </div>
          </div>

          <button
            onClick={resetPrices}
            className="px-3 py-1 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Reset Oracle Prices
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price Crash Slider */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex justify-between text-xs text-slate-300 font-semibold">
              <span>Simulate ETH Price Crash</span>
              <span className="font-mono text-cyan-400">${tokens.ETH.priceUsd.toLocaleString()} USD</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateTokenPrice('ETH', 3200)}
                className="flex-1 py-1 text-xs font-mono bg-slate-900 border border-slate-800 rounded hover:border-slate-700 text-slate-300"
              >
                Normal ($3,200)
              </button>
              <button
                onClick={() => updateTokenPrice('ETH', 2400)}
                className="flex-1 py-1 text-xs font-mono bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 hover:bg-amber-900/40"
              >
                -25% ($2,400)
              </button>
              <button
                onClick={() => updateTokenPrice('ETH', 1750)}
                className="flex-1 py-1 text-xs font-mono bg-rose-950/50 border border-rose-800/60 rounded text-rose-300 hover:bg-rose-900/40"
              >
                -45% Crash ($1,750)
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              Collateral valuation in <code className="text-slate-400">AetherisLendingPool</code> updates immediately.
            </p>
          </div>

          {/* Bob's Position Monitor & Liquidate Button */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Target Borrower: {bobAccount.label}</span>
              <span className={`font-mono font-bold ${getHealthFactorColor(bobMetrics.healthFactor)}`}>
                HF: {bobMetrics.healthFactor.toFixed(2)}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Collateral Value</span>
                <span className="text-slate-200">${bobMetrics.totalCollateralUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Debt</span>
                <span className="text-slate-200">${bobMetrics.totalDebtUsd.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleExecuteLiquidation}
              disabled={bobMetrics.healthFactor >= 1.0}
              className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs tracking-wide transition-all ${
                bobMetrics.healthFactor < 1.0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {bobMetrics.healthFactor < 1.0
                ? '⚡ Execute Liquidation (Claim 5% Bonus)'
                : 'Position Solvent (HF ≥ 1.0)'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Supply / Borrow / Repay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base capitalize">
                {activeModal.type} {activeModal.asset.token.symbol}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Amount to {activeModal.type}</span>
                  <span className="font-mono">
                    Wallet: {currentAccount.balances[activeModal.asset.token.symbol]?.toLocaleString() || 0}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full bg-transparent font-mono text-2xl text-white font-bold focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg text-xs font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Current Interest Rate</span>
                  <span className="text-slate-200">
                    {activeModal.type === 'supply'
                      ? `${activeModal.asset.supplyApy}% APY`
                      : `${activeModal.asset.borrowApy}% APY`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Collateral Factor (Max LTV)</span>
                  <span className="text-slate-200">{(activeModal.asset.collateralFactor * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAction}
              disabled={!actionAmount || parseFloat(actionAmount) <= 0}
              className="w-full py-3 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              Confirm {activeModal.type}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
