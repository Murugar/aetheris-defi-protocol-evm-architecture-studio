import React, { useState } from 'react';
import { useDefi } from '../../context/DefiContext';
import {
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Search,
} from 'lucide-react';

export const TransactionExplorer: React.FC = () => {
  const { transactions, blockNumber } = useDefi();
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const filteredTxs = transactions.filter(
    (tx) =>
      tx.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
      tx.hash.toLowerCase().includes(filterQuery.toLowerCase()) ||
      tx.from.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">EVM Transaction & Block Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time transaction stream, gas profiling, state transitions, and decoded contract event logs.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by hash, method, address..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Simulated EVM Block Ledger</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Latest Block: #{blockNumber.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tx Hash</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Block</th>
                <th className="px-6 py-3.5">From</th>
                <th className="px-6 py-3.5 text-right">Gas Used</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTxs.map((tx) => {
                const isExpanded = expandedTxId === tx.id;
                return (
                  <React.Fragment key={tx.id}>
                    <tr
                      onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                      className="hover:bg-slate-850/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-cyan-400 font-medium">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-[11px]">
                          {tx.action.split('(')[0]}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-400 tabular-nums">#{tx.blockNumber}</td>

                      <td className="px-6 py-4 text-slate-300">
                        {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                      </td>

                      <td className="px-6 py-4 text-right text-slate-400 tabular-nums">
                        {tx.gasUsed.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {tx.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-sans font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Success</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-sans font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reverted</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center text-slate-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Drawer for Event Logs */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-3 font-mono text-xs">
                            <div>
                              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Description</div>
                              <div className="text-slate-200 mt-0.5">{tx.details}</div>
                            </div>

                            {tx.eventsEmitted.length > 0 && (
                              <div>
                                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                                  Decoded Event Logs ({tx.eventsEmitted.length})
                                </div>
                                <div className="space-y-2">
                                  {tx.eventsEmitted.map((ev, i) => (
                                    <div
                                      key={i}
                                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1"
                                    >
                                      <div className="text-cyan-400 font-bold text-xs flex items-center gap-2">
                                        <span>event {ev.name}</span>
                                        <span className="text-[10px] text-slate-500 font-normal">
                                          ({ev.contract})
                                        </span>
                                      </div>
                                      <pre className="text-[11px] text-slate-300">
                                        {JSON.stringify(ev.params, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
