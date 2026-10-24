import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import {
  Wallet,
  Clock,
  Coins,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  Droplets,
  Landmark,
  ShieldCheck,
  Code2,
  Terminal,
  Activity,
  Sparkles,
} from 'lucide-react';

export type ActiveTab =
  | 'swap'
  | 'pools'
  | 'lending'
  | 'staking'
  | 'architecture'
  | 'contracts'
  | 'foundry'
  | 'explorer';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenWalletModal: () => void;
  onOpenFaucetModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenWalletModal,
  onOpenFaucetModal,
}) => {
  const { currentAccount, blockNumber, advanceTime } = useDefi();
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'swap', label: 'Swap', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: 'pools', label: 'Liquidity Pools', icon: <Droplets className="w-4 h-4" /> },
    { id: 'lending', label: 'Lending Market', icon: <Landmark className="w-4 h-4" /> },
    { id: 'staking', label: 'Staking & Vaults', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'architecture', label: 'Architecture & Flows', icon: <Layers className="w-4 h-4" /> },
    { id: 'contracts', label: 'Solidity Code', icon: <Code2 className="w-4 h-4" /> },
    { id: 'foundry', label: 'Foundry Tests', icon: <Terminal className="w-4 h-4" /> },
    { id: 'explorer', label: 'Transactions', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Bar Zone Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <span className="font-bold text-cyan-400 text-lg leading-none">Æ</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('swap')}
            className="text-left font-bold tracking-tight text-white text-lg hover:text-cyan-400 transition-colors whitespace-nowrap"
          >
            Aetheris <span className="text-cyan-400 font-semibold text-sm">Protocol</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs xl:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Wallet, Faucet & Time Control */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Time machine quick jump */}
          <div className="relative">
            <button
              onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors whitespace-nowrap"
              title="Simulate blockchain block time"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advance Time</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {timeDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs font-mono"
                onClick={() => setTimeDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  Simulate Block Time
                </div>
                <button
                  onClick={() => advanceTime(3600)}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                >
                  +1 Hour (300 blocks)
                </button>
                <button
                  onClick={() => advanceTime(86400)}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                >
                  +1 Day (7,200 blocks)
                </button>
                <button
                  onClick={() => advanceTime(86400 * 7)}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                >
                  +7 Days (50,400 blocks)
                </button>
                <button
                  onClick={() => advanceTime(86400 * 30)}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                >
                  +30 Days (Compound APY)
                </button>
              </div>
            )}
          </div>

          {/* Testnet Faucet */}
          <button
            onClick={onOpenFaucetModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg hover:bg-amber-900/40 transition-colors whitespace-nowrap"
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Faucet</span>
          </button>

          {/* Active Account / Connect Wallet */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-900 border border-slate-800 rounded-lg hover:border-cyan-700/60 hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white">{currentAccount.label}</span>
            <span className="text-slate-400 font-mono hidden md:inline">
              {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-bar for mobile navigation & EVM telemetry stats */}
      <div className="border-t border-slate-900 bg-slate-950/60 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-slate-400 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-4 text-[11px] font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">Block:</span>
            <span className="text-cyan-300 font-semibold tabular-nums">#{blockNumber.toLocaleString()}</span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">Gas:</span>
            <span className="text-slate-300 tabular-nums">18 Gwei</span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">AMM Constant:</span>
            <span className="text-slate-300">x · y = k (0.3% fee)</span>
          </span>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-2 py-1 text-[11px] rounded transition-colors whitespace-nowrap ${
                activeTab === item.id ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
