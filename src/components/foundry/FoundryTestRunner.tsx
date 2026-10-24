import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import { FoundryTestCase } from '../../types/defi';
import {
  Terminal,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const FoundryTestRunner: React.FC = () => {
  const { testCases, runAllTests, runSingleTest, isTestingRunning } = useDefi();
  const [selectedTestCase, setSelectedTestCase] = useState<FoundryTestCase>(testCases[0]);
  const [activeTab, setActiveTab] = useState<'tests' | 'gas' | 'traces'>('tests');

  const passedCount = testCases.filter((t) => t.status === 'passed').length;
  const totalCount = testCases.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Foundry Test Engine & Invariant Suite</h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute unit, integration, and invariant fuzz tests powered by Foundry Forge test runner.
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={runAllTests}
            disabled={isTestingRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg shadow-cyan-950/50 disabled:opacity-50"
          >
            {isTestingRunning ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            <span>{isTestingRunning ? 'Running Forge Suite...' : 'Run All Tests (forge test)'}</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Test Suite Status</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {passedCount} / {totalCount} Passed
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Framework</div>
          <div className="text-xl font-bold font-mono text-cyan-400">Foundry Forge</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Fuzz Runs (Invariant)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">10,000 / 10,000</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Compiler</div>
          <div className="text-xl font-bold font-mono text-slate-200">solc 0.8.24 + via-ir</div>
        </div>
      </div>

      {/* Main Terminal and Test Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Cases List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider px-2 pb-2 border-b border-slate-800 flex justify-between items-center">
            <span>Test Cases</span>
            <span className="text-[10px] text-cyan-400 font-mono">forge-std/Test.sol</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {testCases.map((test) => {
              const isSelected = selectedTestCase.id === test.id;
              return (
                <div
                  key={test.id}
                  onClick={() => setSelectedTestCase(test)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      {test.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : test.status === 'running' ? (
                        <RotateCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {test.functionName}()
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runSingleTest(test.id);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 shrink-0 ml-2"
                    >
                      Run
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-sans">{test.description}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                    <span>{test.contractName}</span>
                    <span className="tabular-nums">
                      {test.gasUsed ? `${test.gasUsed.toLocaleString()} gas` : `est. ${test.expectedGas.toLocaleString()} gas`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Terminal & Trace View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          {/* Terminal Title Bar */}
          <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>forge test --match-test {selectedTestCase.functionName} -vvvv</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
          </div>

          {/* Terminal Console Output */}
          <div className="p-6 bg-slate-950 font-mono text-xs text-slate-300 flex-1 space-y-4 overflow-y-auto min-h-[420px]">
            <div className="space-y-1 text-slate-500">
              <div>[⠢] Compiling 8 files with 0.8.24</div>
              <div>[⠆] Solc 0.8.24 finished in 482.10ms</div>
              <div>Compiler run successful with warnings: none</div>
            </div>

            <div className="pt-2 text-slate-400">
              Running 1 test for <span className="text-white font-bold">{selectedTestCase.contractName}</span>
            </div>

            {selectedTestCase.status === 'passed' ? (
              <div className="space-y-3">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    [PASS] {selectedTestCase.functionName}() (gas:{' '}
                    {(selectedTestCase.gasUsed || selectedTestCase.expectedGas).toLocaleString()})
                  </span>
                </div>

                {selectedTestCase.executionLogs?.map((log, i) => (
                  <div key={i} className="pl-6 text-slate-400">
                    {log}
                  </div>
                ))}

                {/* Call Traces */}
                <div className="pt-3 border-t border-slate-900 space-y-1">
                  <div className="text-cyan-400 font-bold">Traces:</div>
                  <div className="pl-4 text-slate-400 space-y-1">
                    <div>
                      [42100] <span className="text-amber-300">AetherisPairTest::setUp()</span>
                    </div>
                    <div className="pl-4">
                      ├─ [24100] VM::prank(alice: [0xa11c...])
                    </div>
                    <div className="pl-4">
                      ├─ [38200] AetherisPair::swap(3216336585140889212, 0, alice, [])
                    </div>
                    <div className="pl-8 text-emerald-400">
                      │  └─ emit Swap(sender: alice, amount0In: 0, amount1In: 10000000000, amount0Out: 3216336585140889212, amount1Out: 0)
                    </div>
                    <div className="pl-4">
                      └─ [0] VM::stopPrank()
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-slate-400">
                  Suite result: <span className="text-emerald-400 font-bold">ok</span>. 1 passed; 0 failed; 0 skipped;
                  finished in 12.4ms
                </div>
              </div>
            ) : selectedTestCase.status === 'running' ? (
              <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Executing EVM opcodes and invariant fuzz runs...</span>
              </div>
            ) : (
              <div className="text-slate-600 italic">
                Test not run yet. Click "Run" or "Run All Tests" above to execute.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
