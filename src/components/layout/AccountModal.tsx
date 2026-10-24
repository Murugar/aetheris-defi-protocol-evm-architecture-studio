import React from 'react';
import { useDefi } from '../../context/DefiContext';
import { X, Check, ExternalLink, Copy, UserCheck } from 'lucide-react';
import { SupportedTokenSymbol } from '../../types/defi';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFaucet: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onOpenFaucet }) => {
  const { accounts, currentAccount, setCurrentAccountAddress, tokens } = useDefi();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">EVM Wallet Switcher</h2>
            <p className="text-xs text-slate-400 mt-0.5">Switch simulated accounts to test trader, borrower & liquidator roles</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Selector List */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Simulated Accounts</label>
            <div className="grid grid-cols-1 gap-2">
              {accounts.map((acc) => {
                const isSelected = acc.address.toLowerCase() === currentAccount.address.toLowerCase();
                return (
                  <button
                    key={acc.address}
                    onClick={() => setCurrentAccountAddress(acc.address)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{acc.label}</span>
                        <span className="text-[11px] font-mono text-cyan-400">
                          {acc.address.slice(0, 6)}...{acc.address.slice(-4)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {acc.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                        <span>{acc.balances.ETH.toFixed(2)} ETH</span>
                        <span>·</span>
                        <span>{acc.balances.USDC.toLocaleString()} USDC</span>
                        <span>·</span>
                        <span>{acc.balances.AETH.toLocaleString()} AETH</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Active Account Balances Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {currentAccount.label}'s Holdings
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenFaucet();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                + Mint from Faucet
              </button>
            </div>

            <div className="bg-slate-950/60 rounded-lg border border-slate-800/80 divide-y divide-slate-800/60">
              {(Object.keys(tokens) as SupportedTokenSymbol[]).map((symbol) => {
                const token = tokens[symbol];
                const balance = currentAccount.balances[symbol] || 0;
                const balanceUsd = balance * token.priceUsd;

                return (
                  <div key={symbol} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                        style={{ backgroundColor: token.iconColor }}
                      >
                        {symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{symbol}</div>
                        <div className="text-[11px] text-slate-500">${token.priceUsd.toLocaleString()} USD</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-medium text-slate-200 tabular-nums">
                        {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        ${balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">Simulated Local EVM Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
