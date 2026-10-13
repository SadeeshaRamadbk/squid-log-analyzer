'use client';

import React from 'react';
import { Tag } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface TopServicesTableProps {
  services: Array<{
    dstPort: number;
    serviceName: string;
    protocol: string;
    flowCount: number;
    bytes: number;
    percentage: number;
  }>;
  onSelectService?: (serviceName: string) => void;
}

export function TopServicesTable({ services, onSelectService }: TopServicesTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Top Application Services & Ports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            L4 port and protocol classification of network flows
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {services.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No service traffic recorded.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Service / Port</th>
                <th className="pb-2.5 w-16">Proto</th>
                <th className="pb-2.5 text-right">Volume</th>
                <th className="pb-2.5 text-right">Flows</th>
                <th className="pb-2.5 pl-4 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {services.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-1 font-medium text-slate-200">
                    <button
                      type="button"
                      onClick={() => onSelectService?.(item.serviceName)}
                      className="hover:text-purple-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="font-semibold text-purple-300">{item.serviceName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({item.dstPort})</span>
                    </button>
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 font-mono">
                      {item.protocol}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-100 font-mono">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 font-mono">
                    {formatNumber(item.flowCount)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
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
