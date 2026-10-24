import React, { useState } from 'react';
import { SOLIDITY_CONTRACTS, ContractFile } from '../../contracts/solidityCode';
import {
  Code2,
  Copy,
  Check,
  FileCode,
  Shield,
  Layers,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const ContractsView: React.FC = () => {
  const [selectedContract, setSelectedContract] = useState<ContractFile>(SOLIDITY_CONTRACTS[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedContract.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Contracts' },
    { id: 'dex', label: 'DEX & AMM' },
    { id: 'lending', label: 'Lending Market' },
    { id: 'vaults', label: 'ERC-4626 Vaults' },
    { id: 'staking', label: 'Staking' },
    { id: 'tests', label: 'Foundry Tests' },
  ];

  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredContracts = SOLIDITY_CONTRACTS.filter(
    (c) => activeCategory === 'all' || c.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Solidity Smart Contracts & Architecture</h1>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade Solidity 0.8.24 source code utilizing OpenZeppelin standards and Foundry test suites.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Contract Code'}</span>
        </button>
      </div>

      {/* Category Filter Pills (Functional Buttons) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeCategory === cat.id
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Split Layout: File Tree + Code Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left: Contract File Tree */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-800">
            Source Files ({filteredContracts.length})
          </div>

          <div className="space-y-1">
            {filteredContracts.map((contract) => {
              const isSelected = selectedContract.name === contract.name;
              return (
                <button
                  key={contract.name}
                  onClick={() => setSelectedContract(contract)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/70 font-bold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span className="truncate">{contract.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">{selectedContract.path}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedContract.description}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Solidity 0.8.24
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                OpenZeppelin v5.0
              </span>
            </div>
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed select-text">
            <pre className="text-slate-300">
              {selectedContract.code.split('\n').map((line, idx) => (
                <div key={idx} className="flex hover:bg-slate-900/50 px-2 py-0.5 rounded">
                  <span className="w-10 text-slate-600 select-none text-right pr-4 tabular-nums text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
