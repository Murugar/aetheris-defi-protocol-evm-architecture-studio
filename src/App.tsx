/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DefiProvider } from './context/DefiContext';
import { Navbar, ActiveTab } from './components/layout/Navbar';
import { AccountModal } from './components/layout/AccountModal';
import { FaucetModal } from './components/layout/FaucetModal';
import { SwapView } from './components/swap/SwapView';
import { PoolsView } from './components/pools/PoolsView';
import { LendingView } from './components/lending/LendingView';
import { StakingView } from './components/staking/StakingView';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { ContractsView } from './components/contracts/ContractsView';
import { FoundryTestRunner } from './components/foundry/FoundryTestRunner';
import { TransactionExplorer } from './components/explorer/TransactionExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('swap');
  const [walletModalOpen, setWalletModalOpen] = useState<boolean>(false);
  const [faucetModalOpen, setFaucetModalOpen] = useState<boolean>(false);

  return (
    <DefiProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
        {/* Navigation Bar conforming to Top Bar Contract */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onOpenFaucetModal={() => setFaucetModalOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'swap' && <SwapView />}
          {activeTab === 'pools' && <PoolsView />}
          {activeTab === 'lending' && <LendingView />}
          {activeTab === 'staking' && <StakingView />}
          {activeTab === 'architecture' && <ArchitectureView />}
          {activeTab === 'contracts' && <ContractsView />}
          {activeTab === 'foundry' && <FoundryTestRunner />}
          {activeTab === 'explorer' && <TransactionExplorer />}
        </main>

        {/* Account Switcher Modal */}
        <AccountModal
          isOpen={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          onOpenFaucet={() => setFaucetModalOpen(true)}
        />

        {/* Faucet Modal */}
        <FaucetModal
          isOpen={faucetModalOpen}
          onClose={() => setFaucetModalOpen(false)}
        />

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">Aetheris DeFi Protocol Suite</span>
              <span>·</span>
              <span>Solidity 0.8.24</span>
              <span>·</span>
              <span>Foundry Forge</span>
              <span>·</span>
              <span>EIP-4626</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <button
                onClick={() => setActiveTab('architecture')}
                className="hover:text-slate-200 transition-colors"
              >
                Architecture Specs
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className="hover:text-slate-200 transition-colors"
              >
                Solidity Code
              </button>
              <button
                onClick={() => setActiveTab('foundry')}
                className="hover:text-slate-200 transition-colors"
              >
                Forge Tests
              </button>
            </div>
          </div>
        </footer>
      </div>
    </DefiProvider>
  );
}
