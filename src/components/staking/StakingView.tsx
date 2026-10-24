import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import {
  ShieldCheck,
  Vault,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Coins,
} from 'lucide-react';

export const StakingView: React.FC = () => {
  const {
    currentAccount,
    stakingPool,
    stakeTokens,
    unstakeTokens,
    claimStakingRewards,
    yieldVault,
    depositVault,
    redeemVault,
  } = useDefi();

  // Staking State
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [lockDurationDays, setLockDurationDays] = useState<number>(90);

  // Vault State
  const [vaultDepositAmount, setVaultDepositAmount] = useState<string>('');
  const [vaultRedeemAmount, setVaultRedeemAmount] = useState<string>('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const lockTiers = [
    { days: 0, label: 'Flexible', multiplier: '1.0x', apy: stakingPool.baseApr },
    { days: 30, label: '30 Days', multiplier: '1.5x', apy: stakingPool.baseApr * 1.5 },
    { days: 90, label: '90 Days', multiplier: '2.0x', apy: stakingPool.baseApr * 2.0 },
    { days: 365, label: '365 Days', multiplier: '2.5x', apy: stakingPool.baseApr * 2.5 },
  ];

  const handleStake = () => {
    const amt = parseFloat(stakeAmount) || 0;
    if (amt <= 0) return;
    const res = stakeTokens(amt, lockDurationDays);
    if (res.success) {
      setToast({ type: 'success', text: res.message });
      setStakeAmount('');
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleClaim = () => {
    const res = claimStakingRewards();
    if (res.success) {
      setToast({ type: 'success', text: res.message });
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleVaultDeposit = () => {
    const amt = parseFloat(vaultDepositAmount) || 0;
    if (amt <= 0) return;
    const res = depositVault(amt);
    if (res.success) {
      setToast({ type: 'success', text: res.message });
      setVaultDepositAmount('');
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleVaultRedeem = () => {
    const amt = parseFloat(vaultRedeemAmount) || 0;
    if (amt <= 0) return;
    const res = redeemVault(amt);
    if (res.success) {
      setToast({ type: 'success', text: res.message });
      setVaultRedeemAmount('');
    } else {
      setToast({ type: 'error', text: res.message });
    }
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Staking Rewards & ERC-4626 Tokenized Vaults</h1>
        <p className="text-xs text-slate-400 mt-1">
          Lock AETH for boosted protocol revenue share or deposit stable assets into auto-compounding ERC-4626 vaults.
        </p>
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
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Grid: Staking Pool vs ERC-4626 Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Module 1: Synthetix Staking Pool with Lock Multiplier */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">AETH Governance Staking</h2>
                  <p className="text-[11px] text-slate-400 font-mono">Synthetix Accumulator Model</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/60">
                Up to {(stakingPool.baseApr * 2.5).toFixed(1)}% APY
              </span>
            </div>

            {/* User Position Stats */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-mono">
              <div>
                <div className="text-slate-500 text-[11px]">Your Staked AETH</div>
                <div className="text-base font-bold text-white tabular-nums">
                  {stakingPool.userStaked.toLocaleString()} AETH
                </div>
                <div className="text-[11px] text-slate-400">
                  Lock Duration: {stakingPool.userLockDurationDays} Days
                </div>
              </div>
              <div className="border-l border-slate-800/80 pl-3">
                <div className="text-slate-500 text-[11px]">Accumulated Rewards</div>
                <div className="text-base font-bold text-cyan-400 tabular-nums">
                  {stakingPool.userEarned.toFixed(4)} AETH
                </div>
                <button
                  onClick={handleClaim}
                  disabled={stakingPool.userEarned <= 0}
                  className="mt-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline disabled:opacity-40 disabled:no-underline"
                >
                  Claim Rewards Now
                </button>
              </div>
            </div>

            {/* Lock Duration Multipliers */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Choose Lock Duration Boost</label>
              <div className="grid grid-cols-4 gap-2">
                {lockTiers.map((tier) => (
                  <button
                    key={tier.days}
                    onClick={() => setLockDurationDays(tier.days)}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      lockDurationDays === tier.days
                        ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/40 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{tier.label}</div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{tier.multiplier} Weight</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{tier.apy.toFixed(1)}% APY</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Input */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Amount to Stake</span>
                <span className="font-mono">
                  Wallet: {currentAccount.balances.AETH.toLocaleString()} AETH
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full bg-transparent font-mono text-xl text-white font-bold focus:outline-none"
                />
                <button
                  onClick={() => setStakeAmount(currentAccount.balances.AETH.toString())}
                  className="px-2 py-1 text-[10px] font-mono bg-slate-800 text-cyan-300 rounded hover:bg-slate-700"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleStake}
              disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
              className="flex-1 py-3 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              Stake AETH
            </button>
            {stakingPool.userStaked > 0 && (
              <button
                onClick={unstakeTokens}
                className="py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Unstake
              </button>
            )}
          </div>
        </div>

        {/* Module 2: ERC-4626 Yield Vault */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Vault className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">ERC-4626 Yield Vault</h2>
                  <p className="text-[11px] text-slate-400 font-mono">Tokenized Vault Standard</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/60">
                +{yieldVault.apy}% APY
              </span>
            </div>

            {/* Vault Share Stats */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-mono">
              <div>
                <div className="text-slate-500 text-[11px]">Your Vault Shares</div>
                <div className="text-base font-bold text-white tabular-nums">
                  {yieldVault.userShares.toFixed(2)} shares
                </div>
                <div className="text-[11px] text-slate-400">
                  Value: ${(yieldVault.userShares * yieldVault.sharePrice).toFixed(2)} USDC
                </div>
              </div>
              <div className="border-l border-slate-800/80 pl-3">
                <div className="text-slate-500 text-[11px]">Share Price</div>
                <div className="text-base font-bold text-emerald-400 tabular-nums">
                  1 Share = {yieldVault.sharePrice.toFixed(4)} USDC
                </div>
                <div className="text-[11px] text-slate-400">
                  Virtual Decimals Offset: 3 (Anti-Inflation)
                </div>
              </div>
            </div>

            {/* Strategy description */}
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60 text-xs text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Active Strategy:</div>
              <p>{yieldVault.strategyName}. Auto-harvested and auto-compounded into vault share value.</p>
            </div>

            {/* Deposit into Vault */}
            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Deposit USDC into Vault</span>
                  <span className="font-mono">
                    Wallet: {currentAccount.balances.USDC.toLocaleString()} USDC
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={vaultDepositAmount}
                    onChange={(e) => setVaultDepositAmount(e.target.value)}
                    className="w-full bg-transparent font-mono text-base text-white font-bold focus:outline-none"
                  />
                  <button
                    onClick={handleVaultDeposit}
                    disabled={!vaultDepositAmount || parseFloat(vaultDepositAmount) <= 0}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              {/* Redeem from Vault */}
              {yieldVault.userShares > 0 && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Redeem Shares for USDC</span>
                    <span className="font-mono">Available: {yieldVault.userShares.toFixed(2)} shares</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={vaultRedeemAmount}
                      onChange={(e) => setVaultRedeemAmount(e.target.value)}
                      className="w-full bg-transparent font-mono text-base text-white font-bold focus:outline-none"
                    />
                    <button
                      onClick={handleVaultRedeem}
                      disabled={!vaultRedeemAmount || parseFloat(vaultRedeemAmount) <= 0}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
