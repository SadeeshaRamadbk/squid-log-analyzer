'use client';

import React, { useState, useMemo } from 'react';
import { Layers, ChevronLeft, ChevronRight, Tag, ArrowDownRight, ArrowUpRight, ArrowUpDown, Maximize2 } from 'lucide-react';
import { formatBytes, formatNumber, formatTime } from '@/lib/formatters';
import { TableToolbar, ColumnDef } from '../common/TableToolbar';
import { SkeletonTable } from '../common/SkeletonTable';
import { exportToCsv } from '@/lib/exportCsv';

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
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onPageChange: (newPage: number) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  onViewPort?: (port: number, protocol?: string) => void;
  isLoading?: boolean;
  onOpenLiveFeed?: () => void;
}

export function LiveFlowsTable({
  records,
  total,
  page,
  totalPages,
  pageSize = 25,
  onPageSizeChange,
  onPageChange,
  onEditAlias,
  onViewProfile,
  onViewPort,
  isLoading,
  onOpenLiveFeed,
}: LiveFlowsTableProps) {
  const [sortKey, setSortKey] = useState<keyof FlowRecord>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'timestamp', label: 'Time', visible: true },
    { key: 'direction', label: 'Direction', visible: true },
    { key: 'srcIp', label: 'Source Host / User', visible: true },
    { key: 'srcPort', label: 'Src Port', visible: true },
    { key: 'dstIp', label: 'Destination Host', visible: true },
    { key: 'serviceName', label: 'Service / Port', visible: true },
    { key: 'protocol', label: 'Proto', visible: true },
    { key: 'tcpFlags', label: 'Flags', visible: true },
    { key: 'bytes', label: 'Volume', visible: true },
    { key: 'packets', label: 'Packets', visible: true },
  ]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const isVisible = (key: string) => columns.find((c) => c.key === key)?.visible !== false;

  const handleSort = (key: keyof FlowRecord) => {
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
    exportToCsv('pfsense_softflowd_flows', records, [
      { key: 'formattedTime', header: 'Timestamp' },
      { key: 'direction', header: 'Direction' },
      { key: 'srcIp', header: 'Source IP' },
      { key: 'userName', header: 'User Name' },
      { key: 'department', header: 'Department' },
      { key: 'srcPort', header: 'Source Port' },
      { key: 'dstIp', header: 'Destination IP' },
      { key: 'dstPort', header: 'Destination Port' },
      { key: 'protocol', header: 'Protocol' },
      { key: 'serviceName', header: 'Service' },
      { key: 'tcpFlags', header: 'TCP Flags' },
      { key: 'bytes', header: 'Bytes' },
      { key: 'packets', header: 'Packets' },
    ]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

        <div className="flex items-center gap-3">
          {onOpenLiveFeed && (
            <button
              type="button"
              onClick={onOpenLiveFeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
              title="Open pfSense NetFlow Live Feed popup with real-time stream & deep filtering"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Feed &amp; Details</span>
            </button>
          )}

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

      {/* Toolbar */}
      <TableToolbar
        totalRecords={total}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        columns={columns}
        onToggleColumn={toggleColumn}
        onExportCsv={handleExportCsv}
      />

      {/* Table Area */}
      <div className="overflow-x-auto max-h-[520px]">
        {isLoading ? (
          <SkeletonTable rows={8} columns={7} />
        ) : sortedRecords.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Layers className="w-6 h-6 mb-1 text-slate-600" />
            No flows recorded under the active filters.
          </div>
        ) : (
          <table className="w-full min-w-[1020px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 shadow-sm">
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                {isVisible('timestamp') && (
                  <th
                    className="py-2.5 pl-2 w-40 cursor-pointer hover:text-white"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Time</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('direction') && (
                  <th
                    className="py-2.5 w-24 cursor-pointer hover:text-white"
                    onClick={() => handleSort('direction')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Direction</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('srcIp') && (
                  <th
                    className="py-2.5 w-48 cursor-pointer hover:text-white"
                    onClick={() => handleSort('srcIp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Source Host / User</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('srcPort') && (
                  <th
                    className="py-2.5 w-24 text-right px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSort('srcPort')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Src Port</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('dstIp') && (
                  <th
                    className="py-2.5 w-48 pl-3 cursor-pointer hover:text-white"
                    onClick={() => handleSort('dstIp')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Destination Host</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('serviceName') && (
                  <th
                    className="py-2.5 w-36 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('serviceName')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Service / Dst Port</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('protocol') && (
                  <th
                    className="py-2.5 w-16 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('protocol')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Proto</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('tcpFlags') && <th className="py-2.5 w-20 px-2">Flags</th>}
                {isVisible('bytes') && (
                  <th
                    className="py-2.5 text-right px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('bytes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Volume</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
                {isVisible('packets') && (
                  <th
                    className="py-2.5 text-right pr-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('packets')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Packets</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sortedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors group">
                  {isVisible('timestamp') && (
                    <td
                      className="py-2.5 pl-2 font-mono text-slate-400 text-[11px] whitespace-nowrap"
                      title={formatTime(r.timestamp, true)}
                    >
                      {formatTime(r.timestamp, true)}
                    </td>
                  )}
                  {isVisible('direction') && (
                    <td className="py-2.5">
                      {r.direction === 'download' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <ArrowDownRight className="w-3 h-3" /> Inbound ⬇
                        </span>
                      ) : r.direction === 'upload' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          <ArrowUpRight className="w-3 h-3" /> Outbound ⬆
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Local ↔
                        </span>
                      )}
                    </td>
                  )}
                  {isVisible('srcIp') && (
                    <td className="py-2.5 font-mono">
                      <div>
                        {r.userName ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(r.srcIp)}
                              className="font-semibold text-slate-100 hover:text-indigo-300 hover:underline cursor-pointer truncate max-w-[140px]"
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
                            onClick={() => onViewProfile?.(r.srcIp)}
                            className="text-indigo-300 text-[11px] font-medium hover:underline hover:text-indigo-200 cursor-pointer text-left truncate"
                            title={`Inspect Profile for ${r.srcIp}`}
                          >
                            {r.srcIp}
                          </button>
                          {!r.userName && onEditAlias && (
                            <button
                              type="button"
                              onClick={() => onEditAlias(r.srcIp)}
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
                  {isVisible('srcPort') && (
                    <td className="py-2.5 text-right px-3">
                      <button
                        type="button"
                        onClick={() => onViewPort?.(r.srcPort, r.protocol)}
                        className="inline-block px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/80 font-mono text-[11px] text-slate-300 cursor-pointer"
                        title={`Inspect Port ${r.srcPort}`}
                      >
                        {r.srcPort}
                      </button>
                    </td>
                  )}
                  {isVisible('dstIp') && (
                    <td className="py-2.5 pl-3 font-mono">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(r.dstIp)}
                        className="text-cyan-300 hover:underline hover:text-cyan-200 cursor-pointer text-left truncate"
                        title={`Inspect Profile for ${r.dstIp}`}
                      >
                        {r.dstIp}
                      </button>
                    </td>
                  )}
                  {isVisible('serviceName') && (
                    <td className="py-2.5 px-2">
                      <button
                        type="button"
                        onClick={() => onViewPort?.(r.dstPort, r.protocol)}
                        className="hover:underline cursor-pointer text-left"
                      >
                        <span className="font-semibold text-purple-300">{r.serviceName}</span>{' '}
                        <span className="text-[10px] text-slate-500 font-mono">({r.dstPort})</span>
                      </button>
                    </td>
                  )}
                  {isVisible('protocol') && (
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 font-mono">
                        {r.protocol}
                      </span>
                    </td>
                  )}
                  {isVisible('tcpFlags') && (
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">
                      {r.tcpFlags}
                    </td>
                  )}
                  {isVisible('bytes') && (
                    <td className={`py-2.5 text-right font-semibold font-mono ${
                      r.direction === 'download' ? 'text-emerald-400' : r.direction === 'upload' ? 'text-purple-400' : 'text-slate-100'
                    }`}>
                      {formatBytes(r.bytes)}
                    </td>
                  )}
                  {isVisible('packets') && (
                    <td className="py-2.5 text-right pr-2 font-mono text-slate-400">
                      {formatNumber(r.packets)}
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
