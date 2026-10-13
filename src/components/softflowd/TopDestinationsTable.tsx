'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface TopDestinationsTableProps {
  destinations: Array<{
    dstIp: string;
    flowCount: number;
    bytes: number;
    packets: number;
    percentage: number;
  }>;
  onSelectDstIp?: (ip: string) => void;
}

export function TopDestinationsTable({ destinations, onSelectDstIp }: TopDestinationsTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            Top Remote Endpoints & Destination IPs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            External destinations receiving highest inbound/outbound volume
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {destinations.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No remote endpoint traffic recorded.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Destination IP</th>
                <th className="pb-2.5 text-right">Volume</th>
                <th className="pb-2.5 text-right">Flows</th>
                <th className="pb-2.5 text-right">Packets</th>
                <th className="pb-2.5 pl-4 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {destinations.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-1 font-mono font-medium text-cyan-300">
                    <button
                      type="button"
                      onClick={() => onSelectDstIp?.(item.dstIp)}
                      title={`Filter by destination ${item.dstIp}`}
                      className="hover:underline cursor-pointer"
                    >
                      {item.dstIp}
                    </button>
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
                          className="bg-cyan-500 h-full rounded-full"
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
