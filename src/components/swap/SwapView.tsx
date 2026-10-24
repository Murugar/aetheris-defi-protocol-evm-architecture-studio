import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import { SupportedTokenSymbol } from '../../types/defi';
import {
  ArrowDownUp,
  Settings2,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SwapView: React.FC = () => {
  const { currentAccount, tokens, pools, executeSwap } = useDefi();

  const [tokenInSymbol, setTokenInSymbol] = useState<SupportedTokenSymbol>('USDC');
  const [tokenOutSymbol, setTokenOutSymbol] = useState<SupportedTokenSymbol>('AETH');
  const [amountIn, setAmountIn] = useState<string>('1000');
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5%
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Find suitable pool
  const activePool = pools.find(
    (p) =>
      (p.token0.symbol === tokenInSymbol && p.token1.symbol === tokenOutSymbol) ||
      (p.token0.symbol === tokenOutSymbol && p.token1.symbol === tokenInSymbol)
  );

  // Math calculation
  const parsedAmountIn = parseFloat(amountIn) || 0;
  let estimatedAmountOut = 0;
  let priceImpact = 0;
  let minimumReceived = 0;
  let spotPrice = 0;
  let executionPrice = 0;

  if (activePool && parsedAmountIn > 0) {
    const isToken0In = activePool.token0.symbol === tokenInSymbol;
    const reserveIn = isToken0In ? activePool.reserve0 : activePool.reserve1;
    const reserveOut = isToken0In ? activePool.reserve1 : activePool.reserve0;

    spotPrice = reserveOut / reserveIn;

    // Uniswap V2 formula with 0.3% fee:
    const amountInWithFee = parsedAmountIn * 997;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000 + amountInWithFee;
    estimatedAmountOut = numerator / denominator;

    executionPrice = estimatedAmountOut / parsedAmountIn;
    priceImpact = Math.max(0, ((spotPrice - executionPrice) / spotPrice) * 100);
    minimumReceived = estimatedAmountOut * (1 - slippage / 100);
  }

  const handleSwapTokens = () => {
    setTokenInSymbol(tokenOutSymbol);
    setTokenOutSymbol(tokenInSymbol);
    setAmountIn(estimatedAmountOut > 0 ? estimatedAmountOut.toFixed(4) : '');
  };

  const handleSetMax = (pct: number) => {
    const bal = currentAccount.balances[tokenInSymbol] || 0;
    const target = bal * pct;
    setAmountIn(target.toFixed(tokenInSymbol === 'USDC' || tokenInSymbol === 'DAI' ? 2 : 4));
  };

  const handleExecute = () => {
    if (!activePool) {
      setStatusMessage({ type: 'error', text: 'No direct liquidity pool found for this pair.' });
      return;
    }
    if (parsedAmountIn <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid swap amount.' });
      return;
    }

    const res = executeSwap(activePool.id, tokenInSymbol, parsedAmountIn, slippage);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setAmountIn('');
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }

    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const userBalanceIn = currentAccount.balances[tokenInSymbol] || 0;
  const userBalanceOut = currentAccount.balances[tokenOutSymbol] || 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Protocol Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Constant Product DEX</h1>
        <p className="text-xs text-slate-400">
          Decentralized token exchange executing algorithmic $x \cdot y = k$ invariant pricing with 0.30% fee.
        </p>
      </div>

      {/* Main Swap Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        {/* Settings Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Instant Swap</span>
            {activePool && (
              <span className="text-[11px] font-mono text-cyan-400">
                Reserves: {activePool.reserve0.toLocaleString()} {activePool.token0.symbol} /{' '}
                {activePool.reserve1.toLocaleString()} {activePool.token1.symbol}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ${
              showSettings ? 'bg-slate-800 text-cyan-400' : 'hover:bg-slate-800/60'
            }`}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Slippage Settings Drawer */}
        {showSettings && (
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Slippage Tolerance</span>
              <span className="font-mono text-cyan-400">{slippage}%</span>
            </div>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0, 2.5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`flex-1 py-1 px-2 rounded font-mono text-xs transition-colors ${
                    slippage === s
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Transactions will revert with <code className="text-slate-400">InvalidK()</code> if executed price deviates beyond slippage tolerance.
            </p>
          </div>
        )}

        {/* Token In Input Container */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 space-y-2 focus-within:border-cyan-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>You Pay</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span>Bal:</span>
              <span className="text-slate-200 tabular-nums">
                {userBalanceIn.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <div className="flex gap-1 ml-1">
                {[0.25, 0.5, 1.0].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSetMax(pct)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-cyan-300 hover:bg-slate-700 rounded transition-colors"
                  >
                    {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-bold text-white placeholder-slate-600 focus:outline-none font-mono tabular-nums"
            />

            {/* Token In Selector */}
            <select
              value={tokenInSymbol}
              onChange={(e) => setTokenInSymbol(e.target.value as SupportedTokenSymbol)}
              className="bg-slate-800 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:border-cyan-400 shrink-0"
            >
              {(Object.keys(tokens) as SupportedTokenSymbol[]).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            ~${(parsedAmountIn * (tokens[tokenInSymbol]?.priceUsd || 0)).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </div>
        </div>

        {/* Swap Direction Inverter Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-md active:scale-95"
            title="Invert swap direction"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* Token Out Receive Container */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>You Receive (Estimated)</span>
            <div className="font-mono">
              <span>Bal: </span>
              <span className="text-slate-200 tabular-nums">
                {userBalanceOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-bold text-cyan-400 font-mono tabular-nums">
              {estimatedAmountOut > 0 ? estimatedAmountOut.toFixed(6) : '0.00'}
            </div>

            {/* Token Out Selector */}
            <select
              value={tokenOutSymbol}
              onChange={(e) => setTokenOutSymbol(e.target.value as SupportedTokenSymbol)}
              className="bg-slate-800 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:border-cyan-400 shrink-0"
            >
              {(Object.keys(tokens) as SupportedTokenSymbol[]).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            ~${(estimatedAmountOut * (tokens[tokenOutSymbol]?.priceUsd || 0)).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </div>
        </div>

        {/* Trade Details Breakdown */}
        {activePool && parsedAmountIn > 0 && (
          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Exchange Rate</span>
              <span className="text-slate-200">
                1 {tokenInSymbol} ≈ {executionPrice.toFixed(6)} {tokenOutSymbol}
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Price Impact</span>
              <span
                className={`${
                  priceImpact > 2.0 ? 'text-amber-400 font-bold' : priceImpact > 5.0 ? 'text-red-400 font-bold' : 'text-emerald-400'
                }`}
              >
                {priceImpact.toFixed(3)}%
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Min. Received after Slippage</span>
              <span className="text-slate-200">
                {minimumReceived.toFixed(6)} {tokenOutSymbol}
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>LP Fee (0.25%) + Protocol (0.05%)</span>
              <span className="text-slate-400">
                {(parsedAmountIn * 0.003).toFixed(4)} {tokenInSymbol}
              </span>
            </div>

            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
              <span>Smart Contract Route</span>
              <span className="text-cyan-400 flex items-center gap-1 text-[11px]">
                {tokenInSymbol} <ArrowRight className="w-3 h-3" /> AetherisPair{' '}
                <ArrowRight className="w-3 h-3" /> {tokenOutSymbol}
              </span>
            </div>
          </div>
        )}

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
                : 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleExecute}
          disabled={!activePool || parsedAmountIn <= 0 || userBalanceIn < parsedAmountIn}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md ${
            !activePool
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : userBalanceIn < parsedAmountIn
              ? 'bg-rose-950/50 text-rose-400 border border-rose-800/60 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 hover:shadow-cyan-500/20 active:scale-[0.99]'
          }`}
        >
          {!activePool
            ? 'No Liquidity Pool Available'
            : userBalanceIn < parsedAmountIn
            ? `Insufficient ${tokenInSymbol} Balance`
            : `Swap ${tokenInSymbol} for ${tokenOutSymbol}`}
        </button>
      </div>

      {/* Protocol Core Logic Proof Callout */}
      <div className="bg-slate-900/50 border border-slate-800/70 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Solidity Invariant Enforcement: (x + Δx · 0.997) · (y - Δy) ≥ k</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          The pair contract maintains Uniswap V2 reserve math. All swaps transfer the input tokens into the pool, verify output via
          <code className="text-cyan-300 mx-1">AetherisPair.swap(...)</code>, and revert if the 0.3% fee invariant formula fails.
        </p>
      </div>
    </div>
  );
};
