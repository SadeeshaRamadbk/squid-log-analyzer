'use client';

import React from 'react';
import { Radio, ChevronLeft, ChevronRight, User, ExternalLink, ShieldAlert, CheckCircle2, Globe } from 'lucide-react';
import { formatBytes } from '@/lib/formatters';
import type { LiveRequestRecord } from '@/lib/db/queries';

interface LiveRequestsTableProps {
  records: LiveRequestRecord[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onSelectIp?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
}

export function LiveRequestsTable({
  records,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  onSelectIp,
  onViewProfile,
}: LiveRequestsTableProps) {
  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'CONNECT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getResultBadge = (code: string, isBlocked: boolean) => {
    if (isBlocked || code.includes('DENIED') || code.includes('BLOCKED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (code.includes('200') || code.includes('TUNNEL')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (code.includes('304') || code.includes('HIT')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live HTTP/S Proxy Stream
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Squid web transactions across internal LAN hosts
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
          Showing {records.length} of {total.toLocaleString()} requests
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mr-2" />
            Streaming proxy requests...
          </div>
        ) : records.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
            No live requests matched current filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Timestamp</th>
                <th className="pb-2.5">Client Host</th>
                <th className="pb-2.5">Method</th>
                <th className="pb-2.5">Destination Domain</th>
                <th className="pb-2.5">Result Code</th>
                <th className="pb-2.5 text-right text-emerald-400">Download ⬇</th>
                <th className="pb-2.5 text-right text-purple-400">Upload ⬆</th>
                <th className="pb-2.5 text-right pr-1">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-1 text-slate-400 whitespace-nowrap">
                    {r.formattedTime.split(' ')[1] || r.formattedTime}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => (onViewProfile ? onViewProfile(r.clientIp) : onSelectIp?.(r.clientIp))}
                        title={`Inspect Dossier for ${r.clientIp}`}
                        className="text-amber-300 hover:text-amber-200 hover:underline cursor-pointer"
                      >
                        {r.clientIp}
                      </button>
                      {r.userName && (
                        <span className="text-[11px] font-sans text-slate-400 flex items-center gap-1">
                          &bull; <User className="w-2.5 h-2.5 text-indigo-400" /> {r.userName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(r.method)}`}>
                      {r.method}
                    </span>
                  </td>
                  <td className="py-2.5 max-w-[200px] truncate text-slate-200" title={r.url || r.domain}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{r.domain}</span>
                    </div>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getResultBadge(r.resultCode, r.isBlocked)}`}>
                      {r.resultCode}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-medium text-emerald-400 whitespace-nowrap">
                    {formatBytes(r.downloadBytes)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-purple-400 whitespace-nowrap">
                    {formatBytes(r.uploadBytes)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-300 pr-1 whitespace-nowrap">
                    {formatBytes(r.bytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
