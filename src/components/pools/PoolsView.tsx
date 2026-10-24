import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import { LiquidityPool, SupportedTokenSymbol } from '../../types/defi';
import {
  Droplets,
  Plus,
  Minus,
  Calculator,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
} from 'lucide-react';

export const PoolsView: React.FC = () => {
  const { currentAccount, pools, tokens, addLiquidity, removeLiquidity } = useDefi();

  const [selectedPoolForAdd, setSelectedPoolForAdd] = useState<LiquidityPool | null>(null);
  const [selectedPoolForRemove, setSelectedPoolForRemove] = useState<LiquidityPool | null>(null);

  // Add Liquidity State
  const [addAmount0, setAddAmount0] = useState<string>('');
  const [addAmount1, setAddAmount1] = useState<string>('');

  // Remove Liquidity State
  const [removePct, setRemovePct] = useState<number>(50);

  // IL Calculator State
  const [ilPriceChangePct, setIlPriceChangePct] = useState<number>(100); // +100% price change

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Add Liquidity Input sync
  const handleAmount0Change = (val: string, pool: LiquidityPool) => {
    setAddAmount0(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0 && pool.reserve0 > 0) {
      const optimalAmount1 = (parsed * pool.reserve1) / pool.reserve0;
      setAddAmount1(optimalAmount1.toFixed(4));
    } else {
      setAddAmount1('');
    }
  };

  const handleAmount1Change = (val: string, pool: LiquidityPool) => {
    setAddAmount1(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0 && pool.reserve1 > 0) {
      const optimalAmount0 = (parsed * pool.reserve0) / pool.reserve1;
      setAddAmount0(optimalAmount0.toFixed(4));
    } else {
      setAddAmount0('');
    }
  };

  const handleExecuteAdd = () => {
    if (!selectedPoolForAdd) return;
    const a0 = parseFloat(addAmount0) || 0;
    const a1 = parseFloat(addAmount1) || 0;
    if (a0 <= 0 || a1 <= 0) return;

    const res = addLiquidity(selectedPoolForAdd.id, a0, a1);
    if (res.success) {
      setToastMessage({ type: 'success', text: res.message });
      setSelectedPoolForAdd(null);
      setAddAmount0('');
      setAddAmount1('');
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExecuteRemove = () => {
    if (!selectedPoolForRemove) return;
    const sharesToBurn = (selectedPoolForRemove.userLpShares * removePct) / 100;
    if (sharesToBurn <= 0) return;

    const res = removeLiquidity(selectedPoolForRemove.id, sharesToBurn);
    if (res.success) {
      setToastMessage({ type: 'success', text: res.message });
      setSelectedPoolForRemove(null);
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Impermanent Loss formula: IL = 2 * sqrt(r) / (1 + r) - 1, where r = 1 + priceChangePct/100
  const priceRatio = 1 + ilPriceChangePct / 100;
  const impermanentLossPct =
    priceRatio > 0 ? (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Liquidity Pools & Automated Market Making</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deposit dual assets to earn 0.25% fee share on all swaps proportional to your pool share.
          </p>
        </div>

        {/* Global Pool Summary Metrics */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <div className="text-slate-500 text-[11px]">Cumulative TVL</div>
            <div className="text-base font-bold text-white tabular-nums">$32,540,000</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-slate-500 text-[11px]">24h Volume</div>
            <div className="text-base font-bold text-cyan-400 tabular-nums">$13,912,200</div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2 text-xs ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
              : 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Pools Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-sm font-bold text-white">All Active Pairs</span>
          <span className="text-xs text-slate-400 font-mono">Fee Model: 0.30% swap fee</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-3.5">Pool Pair</th>
                <th className="px-6 py-3.5">Reserves</th>
                <th className="px-6 py-3.5 text-right">Fee APR</th>
                <th className="px-6 py-3.5 text-right">24h Volume</th>
                <th className="px-6 py-3.5 text-right">Your Position</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pools.map((pool) => {
                const userSharePct =
                  pool.totalLpShares > 0 ? (pool.userLpShares / pool.totalLpShares) * 100 : 0;
                const userToken0 =
                  pool.totalLpShares > 0 ? (pool.userLpShares / pool.totalLpShares) * pool.reserve0 : 0;
                const userToken1 =
                  pool.totalLpShares > 0 ? (pool.userLpShares / pool.totalLpShares) * pool.reserve1 : 0;

                return (
                  <tr key={pool.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1.5 shrink-0">
                          <div
                            className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] text-white"
                            style={{ backgroundColor: pool.token0.iconColor }}
                          >
                            {pool.token0.symbol.slice(0, 2)}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] text-white"
                            style={{ backgroundColor: pool.token1.iconColor }}
                          >
                            {pool.token1.symbol.slice(0, 2)}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {pool.token0.symbol} / {pool.token1.symbol}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {pool.pairAddress.slice(0, 8)}...{pool.pairAddress.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono">
                      <div className="text-slate-200">
                        {pool.reserve0.toLocaleString()} {pool.token0.symbol}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {pool.reserve1.toLocaleString()} {pool.token1.symbol}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      <span className="text-emerald-400 font-bold tabular-nums">+{pool.feeApr.toFixed(1)}%</span>
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-300 tabular-nums">
                      ${pool.volume24h.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      {pool.userLpShares > 0 ? (
                        <div>
                          <div className="font-semibold text-cyan-300 tabular-nums">
                            {pool.userLpShares.toFixed(2)} LP ({userSharePct.toFixed(2)}%)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ~{userToken0.toFixed(2)} {pool.token0.symbol} + {userToken1.toFixed(2)} {pool.token1.symbol}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-sans">No position</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPoolForAdd(pool);
                            setAddAmount0('');
                            setAddAmount1('');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Deposit</span>
                        </button>

                        {pool.userLpShares > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPoolForRemove(pool);
                              setRemovePct(50);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span>Withdraw</span>
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

      {/* Impermanent Loss Interactive Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Interactive Impermanent Loss Simulator</h2>
        </div>
        <p className="text-xs text-slate-400">
          Impermanent Loss (IL) occurs when the price ratio of pooled tokens changes compared to when you deposited.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2 md:col-span-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Token A Price Change vs Token B</span>
              <span className="font-mono font-bold text-cyan-400">
                {ilPriceChangePct >= 0 ? `+${ilPriceChangePct}%` : `${ilPriceChangePct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-80"
              max="400"
              step="5"
              value={ilPriceChangePct}
              onChange={(e) => setIlPriceChangePct(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>-80% (Crash)</span>
              <span>0% (Equal)</span>
              <span>+100% (2x)</span>
              <span>+400% (5x)</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1 text-center flex flex-col justify-center">
            <div className="text-xs text-slate-400">Calculated Impermanent Loss</div>
            <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {impermanentLossPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              vs. Holding assets in wallet
            </div>
          </div>
        </div>
      </div>

      {/* Add Liquidity Modal */}
      {selectedPoolForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Deposit to {selectedPoolForAdd.token0.symbol} / {selectedPoolForAdd.token1.symbol}
              </h3>
              <button
                onClick={() => setSelectedPoolForAdd(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Asset 0 */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{selectedPoolForAdd.token0.symbol} Amount</span>
                  <span className="font-mono">
                    Bal: {currentAccount.balances[selectedPoolForAdd.token0.symbol]?.toFixed(4) || 0}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={addAmount0}
                  onChange={(e) => handleAmount0Change(e.target.value, selectedPoolForAdd)}
                  className="w-full bg-transparent font-mono text-xl text-white font-bold focus:outline-none"
                />
              </div>

              {/* Asset 1 */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{selectedPoolForAdd.token1.symbol} Amount (Auto-Calculated)</span>
                  <span className="font-mono">
                    Bal: {currentAccount.balances[selectedPoolForAdd.token1.symbol]?.toFixed(2) || 0}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={addAmount1}
                  onChange={(e) => handleAmount1Change(e.target.value, selectedPoolForAdd)}
                  className="w-full bg-transparent font-mono text-xl text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg text-xs font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Current Pool Ratio</span>
                <span className="text-slate-200">
                  1 {selectedPoolForAdd.token0.symbol} ={' '}
                  {(selectedPoolForAdd.reserve1 / selectedPoolForAdd.reserve0).toFixed(4)}{' '}
                  {selectedPoolForAdd.token1.symbol}
                </span>
              </div>
            </div>

            <button
              onClick={handleExecuteAdd}
              disabled={!addAmount0 || !addAmount1}
              className="w-full py-3 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              Confirm Deposit
            </button>
          </div>
        </div>
      )}

      {/* Remove Liquidity Modal */}
      {selectedPoolForRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Withdraw from {selectedPoolForRemove.token0.symbol} / {selectedPoolForRemove.token1.symbol}
              </h3>
              <button
                onClick={() => setSelectedPoolForRemove(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Withdraw Percentage</span>
                <span className="font-mono font-bold text-cyan-400">{removePct}%</span>
              </div>
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => setRemovePct(p)}
                    className={`flex-1 py-1.5 rounded font-mono text-xs transition-colors ${
                      removePct === p
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-slate-400 font-semibold">You Will Receive:</div>
                <div className="flex justify-between text-slate-200">
                  <span>{selectedPoolForRemove.token0.symbol}</span>
                  <span className="font-bold">
                    {(
                      (selectedPoolForRemove.userLpShares * removePct * selectedPoolForRemove.reserve0) /
                      (100 * selectedPoolForRemove.totalLpShares)
                    ).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>{selectedPoolForRemove.token1.symbol}</span>
                  <span className="font-bold">
                    {(
                      (selectedPoolForRemove.userLpShares * removePct * selectedPoolForRemove.reserve1) /
                      (100 * selectedPoolForRemove.totalLpShares)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleExecuteRemove}
              className="w-full py-3 rounded-xl font-bold text-sm bg-rose-500 hover:bg-rose-400 text-white transition-colors"
            >
              Confirm Withdrawal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
