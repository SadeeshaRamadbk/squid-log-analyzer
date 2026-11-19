'use client';

import React from 'react';
import { Globe, Download, ShieldAlert } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { Tooltip } from '@/components/ui/Tooltip';
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
  onBlockDomain?: (domain: string) => void;
}

export function TopDomainsTable({ domains, onViewDomain, onBlockDomain }: TopDomainsTableProps) {
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
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/90 border-t-white/10 rounded-xl p-5 shadow-lg flex flex-col h-full">
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
            aria-label="Export CSV - Export top domains to CSV"
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
          <table className="w-full text-left text-xs min-w-[540px]">
            <caption className="sr-only">Top Destination Domains by Request Volume</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 font-semibold bg-slate-950/40">
                <th scope="col" className="pb-2.5 pl-2">Domain</th>
                <th scope="col" className="pb-2.5 text-right pr-2">Requests</th>
                <th scope="col" className="pb-2.5 text-right pr-2">Bandwidth</th>
                <th scope="col" className="pb-2.5 text-right pr-2">Blocked</th>
                <th scope="col" className="pb-2.5 pl-4 pr-2 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {domains.map((item) => (
                <tr
                  key={item.domain}
                  className="even:bg-slate-950/30 odd:bg-slate-900/10 hover:bg-slate-800/60 transition-colors group"
                >
                  <td className="py-2.5 pl-2 font-mono font-medium text-slate-200 truncate max-w-[200px]">
                    <div className="flex items-center justify-between gap-1">
                      <Tooltip content={item.domain}>
                        <button
                          type="button"
                          onClick={() => onViewDomain?.(item.domain)}
                          className="hover:text-cyan-300 hover:underline cursor-pointer truncate text-left focus:outline-none focus:underline"
                          aria-label={`Inspect telemetry for domain ${item.domain}`}
                        >
                          {item.domain}
                        </button>
                      </Tooltip>
                      {onBlockDomain && (
                        <button
                          type="button"
                          onClick={() => onBlockDomain(item.domain)}
                          aria-label={`Block domain ${item.domain}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] text-rose-400 hover:text-rose-300 transition-opacity px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 shrink-0 cursor-pointer"
                          title="Block this domain"
                        >
                          + Block
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-2 text-right font-semibold text-slate-100 tabular-nums font-mono">
                    {formatNumber(item.requestCount)}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-slate-300 font-mono tabular-nums">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums font-mono">
                    {item.blockedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        {formatNumber(item.blockedCount)}
                      </span>
                    ) : (
                      <span className="text-slate-600">0</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-4 pr-2">
                    <div className="flex items-center gap-2 min-w-[50px]">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-mono tabular-nums">
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
