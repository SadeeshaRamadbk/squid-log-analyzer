'use client';

import React from 'react';
import { Globe, ShieldAlert, Download } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';

interface TopDomainsTableProps {
  domains: Array<{
    domain: string;
    requestCount: number;
    blockedCount: number;
    bytes: number;
    percentage: number;
  }>;
  onViewDomain?: (domain: string) => void;
}

export function TopDomainsTable({ domains, onViewDomain }: TopDomainsTableProps) {
  const handleExportCsv = () => {
    exportToCsv('top_domains', domains, [
      { key: 'domain', header: 'Domain' },
      { key: 'requestCount', header: 'Requests' },
      { key: 'bytes', header: 'Bytes' },
      { key: 'blockedCount', header: 'Blocked Count' },
      { key: 'percentage', header: 'Share (%)' },
    ]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Top Domains
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Most frequently requested destination hosts</p>
        </div>

        {domains.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export top domains to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        {domains.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No domain records found.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Domain</th>
                <th className="pb-2.5 text-right">Requests</th>
                <th className="pb-2.5 text-right">Bandwidth</th>
                <th className="pb-2.5 text-right">Blocked</th>
                <th className="pb-2.5 pl-4 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {domains.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-1 font-mono font-medium text-slate-200 truncate max-w-[180px]">
                    <button
                      type="button"
                      onClick={() => onViewDomain?.(item.domain)}
                      className="hover:text-cyan-300 hover:underline cursor-pointer truncate text-left"
                      title={`Inspect ${item.domain}`}
                    >
                      {item.domain}
                    </button>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-100">
                    {formatNumber(item.requestCount)}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 font-mono">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right">
                    {item.blockedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        {formatNumber(item.blockedCount)}
                      </span>
                    ) : (
                      <span className="text-slate-600">0</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
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
