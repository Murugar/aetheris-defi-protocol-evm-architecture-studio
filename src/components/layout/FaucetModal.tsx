import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import { X, Coins, CheckCircle, Sparkles } from 'lucide-react';
import { SupportedTokenSymbol } from '../../types/defi';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({ isOpen, onClose }) => {
  const { currentAccount, faucetMint, tokens } = useDefi();
  const [mintStatus, setMintStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMint = (symbol: SupportedTokenSymbol, amount: number) => {
    faucetMint(symbol, amount);
    setMintStatus(`Successfully minted ${amount.toLocaleString()} ${symbol} to ${currentAccount.label}!`);
    setTimeout(() => {
      setMintStatus(null);
    }, 2500);
  };

  const faucetPresets: { symbol: SupportedTokenSymbol; amount: number; desc: string }[] = [
    { symbol: 'ETH', amount: 5, desc: 'Used for gas, LP pairs, and collateral' },
    { symbol: 'USDC', amount: 10000, desc: 'Used for swaps, lending deposits, and vault shares' },
    { symbol: 'AETH', amount: 500, desc: 'Aetheris governance token for staking & voting' },
    { symbol: 'WBTC', amount: 0.5, desc: 'Collateral asset in lending markets' },
    { symbol: 'DAI', amount: 5000, desc: 'Decentralized stablecoin for arbitrage' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">EVM Testnet Faucet</h2>
              <p className="text-xs text-slate-400">Mint free protocol tokens to {currentAccount.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {mintStatus && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-lg flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{mintStatus}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {faucetPresets.map((preset) => {
              const token = tokens[preset.symbol];
              return (
                <div
                  key={preset.symbol}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: token.iconColor }}
                    >
                      {preset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <span>{preset.amount.toLocaleString()} {preset.symbol}</span>
                        <span className="text-[10px] text-slate-500">
                          (~${(preset.amount * token.priceUsd).toLocaleString()})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{preset.desc}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMint(preset.symbol, preset.amount)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shrink-0"
                  >
                    Mint
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
