'use client';

import React, { useState, useMemo } from 'react';
import { ShieldAlert, Copy, Check, ChevronLeft, ChevronRight, User, Tag, Globe, ArrowUpDown } from 'lucide-react';
import { TableToolbar, ColumnDef } from '../common/TableToolbar';
import { SkeletonTable } from '../common/SkeletonTable';
import { exportToCsv } from '@/lib/exportCsv';
import { formatTime } from '@/lib/formatters';

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
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onPageChange: (newPage: number) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  onViewDomain?: (domain: string) => void;
  isLoading?: boolean;
}

export function BlockedRequestsList({
  records,
  total,
  page,
  totalPages,
  pageSize = 25,
  onPageSizeChange,
  onPageChange,
  onEditAlias,
  onViewProfile,
  onViewDomain,
  isLoading,
}: BlockedRequestsListProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<keyof BlockedRecord>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'timestamp', label: 'Time', visible: true },
    { key: 'clientIp', label: 'Client / User', visible: true },
    { key: 'method', label: 'Method', visible: true },
    { key: 'resultCode', label: 'Result Code', visible: true },
    { key: 'domain', label: 'Target Domain', visible: true },
    { key: 'url', label: 'Full Blocked URL', visible: true },
  ]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const isVisible = (key: string) => columns.find((c) => c.key === key)?.visible !== false;

  const handleSort = (key: keyof BlockedRecord) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [records, sortKey, sortDir]);

  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    exportToCsv('squid_blocked_audit_log', records, [
      { key: 'formattedTime', header: 'Timestamp' },
      { key: 'clientIp', header: 'Client IP' },
      { key: 'userName', header: 'User Name' },
      { key: 'department', header: 'Department' },
      { key: 'method', header: 'Method' },
      { key: 'resultCode', header: 'Result Code' },
      { key: 'domain', header: 'Target Domain' },
      { key: 'url', header: 'Full Blocked URL' },
    ]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Blocked Requests Log
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {total} Total Events
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed security audit log with full URLs and identified internal workstation users
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
                aria-label="Previous page"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                aria-label="Next page"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <TableToolbar
        totalRecords={total}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        columns={columns}
        onToggleColumn={toggleColumn}
        onExportCsv={handleExportCsv}
      />

      <div className="overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : sortedRecords.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs">
            <ShieldAlert className="w-6 h-6 mb-1 text-slate-600" />
            No blocked requests recorded under the active filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                {isVisible('timestamp') && (
                  <th
                    className="pb-2.5 pl-1 w-36 cursor-pointer hover:text-white"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Time</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('clientIp') && (
                  <th
                    className="pb-2.5 w-44 cursor-pointer hover:text-white"
                    onClick={() => handleSort('clientIp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Client IP / User</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('method') && (
                  <th
                    className="pb-2.5 w-16 cursor-pointer hover:text-white"
                    onClick={() => handleSort('method')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Method</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('resultCode') && (
                  <th
                    className="pb-2.5 w-28 cursor-pointer hover:text-white"
                    onClick={() => handleSort('resultCode')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Result Code</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('domain') && (
                  <th
                    className="pb-2.5 w-40 cursor-pointer hover:text-white"
                    onClick={() => handleSort('domain')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Target Domain</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('url') && <th className="pb-2.5">Full Blocked URL</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sortedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors group">
                  {isVisible('timestamp') && (
                    <td
                      className="py-2.5 pl-1 font-mono text-slate-400 text-[11px] whitespace-nowrap"
                      title={formatTime(r.timestamp, true)}
                    >
                      {formatTime(r.timestamp, true)}
                    </td>
                  )}
                  {isVisible('clientIp') && (
                    <td className="py-2.5 font-mono">
                      <div>
                        {r.userName ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(r.clientIp)}
                              className="font-semibold text-slate-100 hover:text-indigo-300 hover:underline cursor-pointer truncate max-w-[120px]"
                            >
                              {r.userName}
                            </button>
                            {r.department && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {r.department}
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewProfile?.(r.clientIp)}
                            className="text-amber-300 font-medium hover:underline hover:text-amber-200 cursor-pointer text-left text-[11px]"
                            title={`Inspect Profile for ${r.clientIp}`}
                          >
                            {r.clientIp}
                          </button>
                          {!r.userName && onEditAlias && (
                            <button
                              type="button"
                              onClick={() => onEditAlias(r.clientIp)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-amber-300 p-0.5 cursor-pointer"
                              title="Assign User Name to this IP"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {isVisible('method') && (
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {r.method}
                      </span>
                    </td>
                  )}
                  {isVisible('resultCode') && (
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
                        {r.resultCode}
                      </span>
                    </td>
                  )}
                  {isVisible('domain') && (
                    <td className="py-2.5 font-mono text-slate-300 max-w-[160px] truncate" title={r.domain}>
                      <button
                        type="button"
                        onClick={() => onViewDomain?.(r.domain)}
                        className="hover:text-cyan-300 hover:underline cursor-pointer truncate flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{r.domain}</span>
                      </button>
                    </td>
                  )}
                  {isVisible('url') && (
                    <td className="py-2.5 font-mono text-[11px] text-slate-400 max-w-xs xl:max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="truncate select-all text-slate-300 hover:text-white" title={r.url}>
                          {r.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(r.id, r.url)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                          title="Copy Full Blocked URL"
                          aria-label="Copy Full Blocked URL"
                        >
                          {copiedId === r.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
