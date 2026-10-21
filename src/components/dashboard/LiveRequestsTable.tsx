'use client';

import React, { useState, useMemo } from 'react';
import { Radio, ChevronLeft, ChevronRight, Globe, ArrowUpDown, Maximize2 } from 'lucide-react';
import { formatBytes, formatTime } from '@/lib/formatters';
import type { LiveRequestRecord } from '@/lib/db/queries';
import { TableToolbar, ColumnDef } from '../common/TableToolbar';
import { SkeletonTable } from '../common/SkeletonTable';
import { exportToCsv } from '@/lib/exportCsv';

interface LiveRequestsTableProps {
  records: LiveRequestRecord[];
  total: number;
  page: number;
  totalPages: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onSelectIp?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  onViewDomain?: (domain: string) => void;
  onOpenLiveFeed?: () => void;
}

export function LiveRequestsTable({
  records,
  total,
  page,
  totalPages,
  pageSize = 25,
  onPageSizeChange,
  isLoading,
  onPageChange,
  onSelectIp,
  onViewProfile,
  onViewDomain,
  onOpenLiveFeed,
}: LiveRequestsTableProps) {
  const [sortKey, setSortKey] = useState<keyof LiveRequestRecord>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Column visibility state
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'timestamp', label: 'Timestamp', visible: true },
    { key: 'clientIp', label: 'Client Host', visible: true },
    { key: 'method', label: 'Method', visible: true },
    { key: 'domain', label: 'Domain', visible: true },
    { key: 'resultCode', label: 'Result Code', visible: true },
    { key: 'downloadBytes', label: 'Download', visible: true },
    { key: 'uploadBytes', label: 'Upload', visible: true },
    { key: 'bytes', label: 'Total Volume', visible: true },
  ]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const isVisible = (key: string) => columns.find((c) => c.key === key)?.visible !== false;

  const handleSort = (key: keyof LiveRequestRecord) => {
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

  const handleExportCsv = () => {
    exportToCsv('squid_live_requests', records, [
      { key: 'formattedTime', header: 'Time' },
      { key: 'clientIp', header: 'Client IP' },
      { key: 'userName', header: 'User Name' },
      { key: 'department', header: 'Department' },
      { key: 'method', header: 'Method' },
      { key: 'domain', header: 'Domain' },
      { key: 'url', header: 'URL' },
      { key: 'resultCode', header: 'Result Code' },
      { key: 'downloadBytes', header: 'Download Bytes' },
      { key: 'uploadBytes', header: 'Upload Bytes' },
      { key: 'bytes', header: 'Total Bytes' },
    ]);
  };

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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full space-y-3">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live HTTP/S Proxy Stream
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Squid web transactions across internal LAN workstations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenLiveFeed && (
            <button
              type="button"
              onClick={onOpenLiveFeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
              title="Open Squid Live Feed popup with real-time stream & deep filtering"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Feed &amp; Details</span>
            </button>
          )}

          {/* Pagination Controls */}
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
      </div>

      {/* Toolbar: Page size, column visibility, export CSV */}
      <TableToolbar
        totalRecords={total}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        columns={columns}
        onToggleColumn={toggleColumn}
        onExportCsv={handleExportCsv}
      />

      {/* Main Table Area */}
      <div className="overflow-x-auto flex-1">
        {isLoading && sortedRecords.length === 0 ? (
          <SkeletonTable rows={8} columns={6} />
        ) : sortedRecords.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Radio className="w-6 h-6 mb-1 text-slate-600" />
            No live proxy requests recorded under current filter range.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                {isVisible('timestamp') && (
                  <th
                    className="pb-2.5 pl-1 cursor-pointer hover:text-white transition-colors"
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
                    className="pb-2.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('clientIp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Client Host / Employee</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('method') && (
                  <th
                    className="pb-2.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('method')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Method</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('domain') && (
                  <th
                    className="pb-2.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('domain')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Destination Domain</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('resultCode') && (
                  <th
                    className="pb-2.5 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('resultCode')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Result Code</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('downloadBytes') && (
                  <th
                    className="pb-2.5 text-right text-emerald-400 cursor-pointer hover:text-emerald-300"
                    onClick={() => handleSort('downloadBytes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Download ⬇</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('uploadBytes') && (
                  <th
                    className="pb-2.5 text-right text-purple-400 cursor-pointer hover:text-purple-300"
                    onClick={() => handleSort('uploadBytes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Upload ⬆</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('bytes') && (
                  <th
                    className="pb-2.5 text-right pr-1 cursor-pointer hover:text-white"
                    onClick={() => handleSort('bytes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {sortedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  {isVisible('timestamp') && (
                    <td
                      className="py-2.5 pl-1 text-slate-400 whitespace-nowrap text-[11px]"
                      title={formatTime(r.timestamp, true)}
                    >
                      {formatTime(r.timestamp)}
                    </td>
                  )}
                  {isVisible('clientIp') && (
                    <td className="py-2.5 whitespace-nowrap">
                      <div>
                        {r.userName ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => (onViewProfile ? onViewProfile(r.clientIp) : onSelectIp?.(r.clientIp))}
                              className="font-semibold text-slate-100 hover:text-amber-300 hover:underline cursor-pointer"
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
                        <button
                          type="button"
                          onClick={() => (onViewProfile ? onViewProfile(r.clientIp) : onSelectIp?.(r.clientIp))}
                          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          {r.clientIp}
                        </button>
                      </div>
                    </td>
                  )}
                  {isVisible('method') && (
                    <td className="py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(r.method)}`}>
                        {r.method}
                      </span>
                    </td>
                  )}
                  {isVisible('domain') && (
                    <td className="py-2.5 max-w-[220px] truncate text-slate-200 font-sans" title={r.url || r.domain}>
                      <button
                        type="button"
                        onClick={() => onViewDomain?.(r.domain)}
                        className="flex items-center gap-1 hover:text-cyan-300 hover:underline cursor-pointer truncate"
                      >
                        <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{r.domain}</span>
                      </button>
                    </td>
                  )}
                  {isVisible('resultCode') && (
                    <td className="py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getResultBadge(r.resultCode, r.isBlocked)}`}>
                        {r.resultCode}
                      </span>
                    </td>
                  )}
                  {isVisible('downloadBytes') && (
                    <td className="py-2.5 text-right font-medium text-emerald-400 whitespace-nowrap">
                      {formatBytes(r.downloadBytes)}
                    </td>
                  )}
                  {isVisible('uploadBytes') && (
                    <td className="py-2.5 text-right font-medium text-purple-400 whitespace-nowrap">
                      {formatBytes(r.uploadBytes)}
                    </td>
                  )}
                  {isVisible('bytes') && (
                    <td className="py-2.5 text-right pr-1 font-semibold text-slate-100 whitespace-nowrap">
                      {formatBytes(r.bytes)}
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
