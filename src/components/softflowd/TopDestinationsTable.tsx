'use client';

import React, { useState } from 'react';
import { Globe, ArrowLeftRight } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';

interface DestinationItem {
  dstIp: string;
  flowCount: number;
  bytes: number;
  packets: number;
  percentage: number;
  org?: string | null;
  hostname?: string | null;
}

interface TopDestinationsTableProps {
  destinations: DestinationItem[];
  internalDestinations?: DestinationItem[];
  onSelectDstIp?: (ip: string) => void;
}

export function TopDestinationsTable({
  destinations,
  internalDestinations = [],
  onSelectDstIp,
}: TopDestinationsTableProps) {
  const [tab, setTab] = useState<'external' | 'internal'>('external');
  const items = tab === 'external' ? destinations : internalDestinations;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            {tab === 'external' ? (
              <Globe className="w-4 h-4 text-cyan-400" />
            ) : (
              <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            )}
            {tab === 'external' ? 'Top Remote Endpoints (WAN)' : 'Internal ↔ Internal Traffic (LAN)'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tab === 'external'
              ? 'External destination endpoints receiving highest traffic'
              : 'East-West broadcast, local subnet, and inter-host communication'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('external')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              tab === 'external'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            External WAN
          </button>
          <button
            type="button"
            onClick={() => setTab('internal')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              tab === 'internal'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Internal ↔ Internal
          </button>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() =>
              exportToCsv(
                tab === 'external' ? 'top_external_destinations' : 'top_internal_traffic',
                items,
                [
                  { key: 'dstIp', header: 'Destination IP' },
                  { key: 'bytes', header: 'Bytes' },
                  { key: 'flowCount', header: 'Flow Count' },
                  { key: 'packets', header: 'Packets' },
                  { key: 'percentage', header: 'Share (%)' },
                ]
              )
            }
            aria-label="Export destinations to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer self-start sm:self-auto"
            title="Export to CSV"
          >
            <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        {items.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            {tab === 'external'
              ? 'No external WAN traffic recorded.'
              : 'No East-West internal traffic recorded.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">
                  {tab === 'external' ? 'External Destination IP' : 'Internal Host IP'}
                </th>
                <th className="pb-2.5 text-right">Volume</th>
                <th className="pb-2.5 text-right">Flows</th>
                <th className="pb-2.5 text-right">Packets</th>
                <th className="pb-2.5 pl-4 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-1">
                    {tab === 'external' && (item.org || item.hostname) ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <span className="text-cyan-300 font-medium">{item.org || item.hostname}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          <button
                            type="button"
                            onClick={() => onSelectDstIp?.(item.dstIp)}
                            title={`Filter by destination ${item.dstIp}`}
                            className="hover:underline hover:text-cyan-300 cursor-pointer"
                          >
                            {item.dstIp}
                          </button>
                          {item.hostname && item.org && item.hostname !== item.org && (
                            <span className="text-slate-500 truncate max-w-[180px]" title={item.hostname}>
                              ({item.hostname})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectDstIp?.(item.dstIp)}
                        title={`Filter by destination ${item.dstIp}`}
                        className="font-mono font-medium text-cyan-300 hover:underline cursor-pointer"
                      >
                        {item.dstIp}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-100 font-mono">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right text-slate-300 font-mono">
                    {formatNumber(item.flowCount)}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 font-mono">
                    {formatNumber(item.packets)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={tab === 'external' ? 'bg-cyan-500 h-full rounded-full' : 'bg-amber-500 h-full rounded-full'}
                          style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-mono">
                        {item.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
