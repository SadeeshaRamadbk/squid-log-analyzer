'use client';

import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, ChevronLeft, ChevronRight, User, Tag } from 'lucide-react';

export interface BlockedRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  clientIp: string;
  userName?: string | null;
  department?: string | null;
  method: string;
  domain: string;
  url: string;
  resultCode: string;
  bytes: number;
}

interface BlockedRequestsListProps {
  records: BlockedRecord[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  isLoading?: boolean;
}

export function BlockedRequestsList({
  records,
  total,
  page,
  totalPages,
  onPageChange,
  onEditAlias,
  onViewProfile,
  isLoading,
}: BlockedRequestsListProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Blocked Requests Log
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {total} Total Events
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed security log with full URLs and identified internal workstation users
          </p>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {records.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs">
            <ShieldAlert className="w-6 h-6 mb-1 text-slate-600" />
            No blocked requests recorded under the active filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1 w-36">Time (UTC)</th>
                <th className="pb-2.5 w-44">Client IP / User</th>
                <th className="pb-2.5 w-16">Method</th>
                <th className="pb-2.5 w-28">Result Code</th>
                <th className="pb-2.5 w-40">Target Domain</th>
                <th className="pb-2.5">Full Blocked URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-2.5 pl-1 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {r.formattedTime}
                  </td>
                  <td className="py-2.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(r.clientIp)}
                        className="text-amber-300 font-medium hover:underline hover:text-amber-200 cursor-pointer text-left"
                        title={`Inspect Profile for ${r.clientIp}`}
                      >
                        {r.clientIp}
                      </button>
                      {r.userName ? (
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(r.clientIp)}
                          className="text-[10px] text-slate-300 font-sans px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 truncate max-w-[100px] hover:text-indigo-300 cursor-pointer"
                          title={`${r.userName}${r.department ? ` (${r.department})` : ''} - View Profile`}
                        >
                          {r.userName}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditAlias?.(r.clientIp)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-amber-300 p-0.5"
                          title="Assign User Name to this IP"
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                      {r.method}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
                      {r.resultCode}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-slate-200 truncate max-w-[150px]">
                    {r.domain}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 group max-w-xl">
                      <span
                        className="font-mono text-rose-300/90 text-[11px] truncate select-all"
                        title={r.url}
                      >
                        {r.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(r.id, r.url)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-100 transition-all shrink-0 cursor-pointer"
                        title="Copy full URL"
                      >
                        {copiedId === r.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
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
