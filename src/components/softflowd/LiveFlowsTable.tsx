'use client';

import React from 'react';
import { Layers, ChevronLeft, ChevronRight, Tag, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

export interface FlowRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  srcIp: string;
  userName?: string | null;
  department?: string | null;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  serviceName: string;
  bytes: number;
  direction?: 'download' | 'upload' | 'internal';
  packets: number;
  tcpFlags: string;
  flowDurationMs: number;
}

interface LiveFlowsTableProps {
  records: FlowRecord[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  isLoading?: boolean;
}

export function LiveFlowsTable({
  records,
  total,
  page,
  totalPages,
  onPageChange,
  onEditAlias,
  onViewProfile,
  isLoading,
}: LiveFlowsTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Live Flow Audit Log (softflowd)
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {formatNumber(total)} Total Flows
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual Layer 3 & 4 sessions captured and exported by pfSense
          </p>
        </div>

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
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
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
            <Layers className="w-6 h-6 mb-1 text-slate-600" />
            No flows recorded under the active filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1 w-36">Time (UTC)</th>
                <th className="pb-2.5 w-24">Type</th>
                <th className="pb-2.5 w-44">Source Host / User</th>
                <th className="pb-2.5 w-16 text-right">Src Port</th>
                <th className="pb-2.5 w-40">Destination Host</th>
                <th className="pb-2.5 w-28">Service / Dst Port</th>
                <th className="pb-2.5 w-16">Proto</th>
                <th className="pb-2.5 w-20">Flags</th>
                <th className="pb-2.5 text-right">Volume</th>
                <th className="pb-2.5 text-right pr-2">Packets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-2.5 pl-1 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {r.formattedTime}
                  </td>
                  <td className="py-2.5">
                    {r.direction === 'download' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <ArrowDownRight className="w-3 h-3" /> Download
                      </span>
                    ) : r.direction === 'upload' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <ArrowUpRight className="w-3 h-3" /> Upload
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Local
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(r.srcIp)}
                        className="text-indigo-300 font-medium hover:underline hover:text-indigo-200 cursor-pointer text-left"
                        title={`Inspect Profile for ${r.srcIp}`}
                      >
                        {r.srcIp}
                      </button>
                      {r.userName ? (
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(r.srcIp)}
                          className="text-[10px] text-slate-300 font-sans px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 truncate max-w-[100px] hover:text-indigo-300 cursor-pointer"
                          title={`${r.userName}${r.department ? ` (${r.department})` : ''} - View Profile`}
                        >
                          {r.userName}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditAlias?.(r.srcIp)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-amber-300 p-0.5"
                          title="Assign User Name to this IP"
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-400">
                    {r.srcPort}
                  </td>
                  <td className="py-2.5 font-mono">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(r.dstIp)}
                      className="text-cyan-300 hover:underline hover:text-cyan-200 cursor-pointer text-left"
                      title={`Inspect Profile for ${r.dstIp}`}
                    >
                      {r.dstIp}
                    </button>
                  </td>
                  <td className="py-2.5">
                    <span className="font-semibold text-purple-300">{r.serviceName}</span>{' '}
                    <span className="text-[10px] text-slate-500 font-mono">({r.dstPort})</span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 font-mono">
                      {r.protocol}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-400">
                    {r.tcpFlags}
                  </td>
                  <td className={`py-2.5 text-right font-semibold font-mono ${
                    r.direction === 'download' ? 'text-emerald-400' : r.direction === 'upload' ? 'text-purple-400' : 'text-slate-100'
                  }`}>
                    {formatBytes(r.bytes)}
                  </td>
                  <td className="py-2.5 text-right pr-2 font-mono text-slate-400">
                    {formatNumber(r.packets)}
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
