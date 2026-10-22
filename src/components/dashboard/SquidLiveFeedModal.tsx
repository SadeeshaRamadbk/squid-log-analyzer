'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  X,
  Search,
  RefreshCw,
  Download,
  Globe,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { formatBytes, formatNumber, formatTime } from '@/lib/formatters';
import type { LiveRequestRecord } from '@/lib/db/queries';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { exportToCsv } from '@/lib/exportCsv';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface SquidLiveFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientIp?: string;
  onSelectIp?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  onViewDomain?: (domain: string) => void;
}

export function SquidLiveFeedModal({
  isOpen,
  onClose,
  initialClientIp,
  onSelectIp,
  onViewProfile,
  onViewDomain,
}: SquidLiveFeedModalProps) {
  // Data state
  const [records, setRecords] = useState<LiveRequestRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Auto-refresh interval (0 = off, 2000 = 2s, 5000 = 5s, 10000 = 10s)
  const [refreshInterval, setRefreshInterval] = useState<number>(3000);
  const [selectedRecord, setSelectedRecord] = useState<LiveRequestRecord | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'blocked' | 'allowed' | 'TCP_DENIED' | 'TCP_TUNNEL' | 'TCP_HIT' | 'TCP_MISS'>('all');
  const [clientIp, setClientIp] = useState(initialClientIp || '');
  const [timeWindow, setTimeWindow] = useState<'30m' | '1h' | undefined>('30m');
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();

  // Sync initialClientIp
  useEffect(() => {
    if (initialClientIp) {
      setClientIp(initialClientIp);
    }
  }, [initialClientIp]);

  // Fetch live requests
  const fetchLogs = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));

      if (search.trim()) params.set('search', search.trim());
      if (method) params.set('method', method);
      if (clientIp.trim()) params.set('clientIp', clientIp.trim());

      if (resultFilter === 'blocked') params.set('isBlocked', 'true');
      else if (resultFilter === 'allowed') params.set('isBlocked', 'false');
      else if (resultFilter !== 'all') params.set('resultCode', resultFilter);

      if (timeWindow) {
        params.set('timeWindow', timeWindow);
      } else {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      const res = await fetch(`/api/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRecords(json.data.records || []);
        setTotal(json.data.total || 0);
        setPage(json.data.page || 1);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching Squid live feed:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, method, clientIp, resultFilter, timeWindow, startDate, endDate]);

  // Trigger fetch when filters or modal open state change
  useEffect(() => {
    if (isOpen) {
      fetchLogs(1);
    }
  }, [isOpen, fetchLogs]);

  // Auto-refresh timer
  useEffect(() => {
    if (!isOpen || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLogs(page);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [isOpen, refreshInterval, page, fetchLogs]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedRecord) {
          setSelectedRecord(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedRecord, onClose]);

  const modalRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const handleCopyUrl = (urlText: string) => {
    navigator.clipboard.writeText(urlText);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleExportCsv = () => {
    const exportData = records.map((r) => ({
      Timestamp: r.formattedTime,
      ClientIP: r.clientIp,
      Username: r.userName || '',
      Department: r.department || '',
      Method: r.method,
      Domain: r.domain,
      URL: r.url || '',
      ResultCode: r.resultCode,
      IsBlocked: r.isBlocked ? 'YES' : 'NO',
      TotalBytes: r.bytes,
      DownloadBytes: r.downloadBytes,
      UploadBytes: r.uploadBytes,
    }));
    const columns = [
      { key: 'Timestamp', header: 'Timestamp' },
      { key: 'ClientIP', header: 'Client IP' },
      { key: 'Username', header: 'Username' },
      { key: 'Department', header: 'Department' },
      { key: 'Method', header: 'Method' },
      { key: 'Domain', header: 'Domain' },
      { key: 'URL', header: 'URL' },
      { key: 'ResultCode', header: 'Result Code' },
      { key: 'IsBlocked', header: 'Blocked' },
      { key: 'TotalBytes', header: 'Total Bytes' },
      { key: 'DownloadBytes', header: 'Download Bytes' },
      { key: 'UploadBytes', header: 'Upload Bytes' },
    ];
    exportToCsv('squid_live_feed', exportData, columns);
  };

  const resetFilters = () => {
    setSearch('');
    setMethod('');
    setResultFilter('all');
    setClientIp('');
    setTimeWindow('30m');
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || method || resultFilter !== 'all' || clientIp || timeWindow !== '30m' || startDate || endDate
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="squid-live-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-[1500px] h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
      >
        
        {/* ============================================================== */}
        {/* Header Bar */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className={`w-5 h-5 ${refreshInterval > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="squid-live-title" className="text-base font-bold text-white tracking-tight">
                  Squid Proxy Live Stream
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${refreshInterval > 0 ? 'animate-ping' : ''}`} />
                  {refreshInterval > 0 ? `Streaming (${refreshInterval / 1000}s)` : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time Layer-7 HTTP/S request inspection and deep diagnostics
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Auto-Refresh Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setRefreshInterval(0)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 0 ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => setRefreshInterval(2000)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 2000 ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2s
              </button>
              <button
                type="button"
                onClick={() => setRefreshInterval(3000)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 3000 ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3s
              </button>
              <button
                type="button"
                onClick={() => setRefreshInterval(10000)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 10000 ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                10s
              </button>
            </div>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => fetchLogs(page)}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer disabled:opacity-50"
              title="Export current page to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Squid live stream dialog"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Filtering Mechanism Toolbar */}
        {/* ============================================================== */}
        <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800/80 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domain, URL, client IP, or user..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Method Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 text-[11px] font-medium">Method:</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-200">All Methods</option>
                  <option value="CONNECT" className="bg-slate-900 text-slate-200">CONNECT (SSL)</option>
                  <option value="GET" className="bg-slate-900 text-slate-200">GET</option>
                  <option value="POST" className="bg-slate-900 text-slate-200">POST</option>
                  <option value="HEAD" className="bg-slate-900 text-slate-200">HEAD</option>
                  <option value="PUT" className="bg-slate-900 text-slate-200">PUT</option>
                  <option value="DELETE" className="bg-slate-900 text-slate-200">DELETE</option>
                </select>
              </div>

              {/* Status / Result Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 text-[11px] font-medium">Result:</span>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as any)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Results</option>
                  <option value="allowed" className="bg-slate-900 text-emerald-400">Allowed Only</option>
                  <option value="blocked" className="bg-slate-900 text-rose-400">Blocked Only</option>
                  <option value="TCP_TUNNEL" className="bg-slate-900 text-blue-400">TCP_TUNNEL</option>
                  <option value="TCP_HIT" className="bg-slate-900 text-emerald-400">TCP_HIT (Cache)</option>
                  <option value="TCP_MISS" className="bg-slate-900 text-slate-300">TCP_MISS</option>
                  <option value="TCP_DENIED" className="bg-slate-900 text-rose-400">TCP_DENIED</option>
                </select>
              </div>

              {/* Time Window Buttons */}
              <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setTimeWindow('30m');
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    timeWindow === '30m' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30 Min
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeWindow('1h');
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    timeWindow === '1h' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeWindow(undefined);
                    const todayStr = new Date().toISOString().split('T')[0];
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    !timeWindow && startDate === new Date().toISOString().split('T')[0] && endDate === startDate
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
              </div>

              {/* Custom Date Range */}
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                compact
                onChange={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                  setTimeWindow(undefined);
                }}
              />

              {/* Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                  title="Clear all filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-3">
              <span>
                Matching Requests: <strong className="text-white font-mono">{formatNumber(total)}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Showing: <strong className="text-slate-200 font-mono">{records.length}</strong> records on page{' '}
                <strong className="text-slate-200 font-mono">{page}</strong> of{' '}
                <strong className="text-slate-200 font-mono">{totalPages}</strong>
              </span>
            </div>
            <span className="text-slate-500 text-[10px] italic">
              Click any row to open the complete Request Inspector
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Main Records Table */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-auto bg-slate-950/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-3">Client Host / User</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Destination Domain & URL</th>
                <th className="py-2.5 px-3">Result Code</th>
                <th className="py-2.5 px-3 text-right">Download ⬇</th>
                <th className="py-2.5 px-3 text-right">Upload ⬆</th>
                <th className="py-2.5 px-4 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-sans">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Streaming live proxy requests...</span>
                      </div>
                    ) : (
                      <span>No proxy logs matched your current filters.</span>
                    )}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isBlocked = r.isBlocked || r.resultCode.includes('DENIED');
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRecord(r)}
                      className={`hover:bg-slate-800/60 transition-colors cursor-pointer group ${
                        selectedRecord?.id === r.id ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      {/* Time */}
                      <td
                        className="py-2 px-4 whitespace-nowrap text-slate-400 text-[11px]"
                        title={formatTime(r.timestamp, true)}
                      >
                        {formatTime(r.timestamp)}
                      </td>

                      {/* Client Host */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div>
                          {r.userName && (
                            <div className="font-sans font-semibold text-slate-200 text-xs">
                              {r.userName}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewProfile) onViewProfile(r.clientIp);
                              else onSelectIp?.(r.clientIp);
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-mono cursor-pointer"
                          >
                            {r.clientIp}
                          </button>
                        </div>
                      </td>

                      {/* Method */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            r.method === 'CONNECT'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : r.method === 'GET'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                              : r.method === 'POST'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {r.method}
                        </span>
                      </td>

                      {/* Domain & URL */}
                      <td className="py-2 px-3 max-w-sm truncate font-sans">
                        <div className="flex items-center gap-1.5 truncate">
                          <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="font-medium text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                            {r.domain}
                          </span>
                        </div>
                        {r.url && (
                          <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                            {r.url}
                          </div>
                        )}
                      </td>

                      {/* Result Code */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            isBlocked
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              : r.resultCode.includes('HIT')
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {r.resultCode}
                        </span>
                      </td>

                      {/* Download */}
                      <td className="py-2 px-3 text-right font-medium text-emerald-400 whitespace-nowrap text-[11px]">
                        {formatBytes(r.downloadBytes)}
                      </td>

                      {/* Upload */}
                      <td className="py-2 px-3 text-right font-medium text-purple-400 whitespace-nowrap text-[11px]">
                        {formatBytes(r.uploadBytes)}
                      </td>

                      {/* Volume */}
                      <td className="py-2 px-4 text-right font-bold text-slate-100 whitespace-nowrap text-[11px]">
                        {formatBytes(r.bytes)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* Footer & Pagination */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 border-t border-slate-800 shrink-0 text-xs">
          {/* Page size */}
          <div className="flex items-center gap-2 text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          {/* Pagination Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchLogs(1)}
              disabled={page <= 1 || loading}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First Page"
            >
              &laquo;
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-slate-300 text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(totalPages)}
              disabled={page >= totalPages || loading}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last Page"
            >
              &raquo;
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Request Inspector Slide-Over / Detail Drawer */}
        {/* ============================================================== */}
        {selectedRecord && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col z-50 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Squid Request Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Full URL & Domain */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Target Destination</span>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(selectedRecord.url || selectedRecord.domain)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-emerald-300 text-xs break-all leading-relaxed font-semibold">
                  {selectedRecord.url || selectedRecord.domain}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                  <span>Domain: <strong className="text-white">{selectedRecord.domain}</strong></span>
                  {onViewDomain && (
                    <button
                      type="button"
                      onClick={() => onViewDomain(selectedRecord.domain)}
                      className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      Domain Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Client & Employee Identity */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Originating Workstation
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">Client IPv4:</span>
                    <div className="font-mono text-amber-400 font-bold">{selectedRecord.clientIp}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Employee Name:</span>
                    <div className="text-slate-200 font-medium">{selectedRecord.userName || 'Unassigned'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Department:</span>
                    <div className="text-slate-200">{selectedRecord.department || 'General'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Telemetry Action:</span>
                    {onViewProfile && (
                      <button
                        type="button"
                        onClick={() => onViewProfile(selectedRecord.clientIp)}
                        className="text-cyan-400 hover:underline block cursor-pointer mt-0.5"
                      >
                        Open Full User Dossier &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* HTTP Protocol & Result Code */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Transaction Classification
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">HTTP Method:</span>
                    <div className="font-mono font-bold text-white">{selectedRecord.method}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Squid Result Code:</span>
                    <div className="font-mono font-bold text-emerald-400">{selectedRecord.resultCode}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Security Status:</span>
                    <div>
                      {selectedRecord.isBlocked ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          BLOCKED / DENIED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          ALLOWED
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Log Record ID:</span>
                    <div className="font-mono text-slate-400">#{selectedRecord.id}</div>
                  </div>
                </div>
              </div>

              {/* Bandwidth Breakdown */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Bandwidth & Transfer Payload
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Download ⬇</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatBytes(selectedRecord.downloadBytes)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Upload ⬆</span>
                    <span className="font-bold text-purple-400 font-mono">
                      {formatBytes(selectedRecord.uploadBytes)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Total Transfer</span>
                    <span className="font-bold text-white font-mono">
                      {formatBytes(selectedRecord.bytes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>Timestamp: <span className="text-slate-200 font-mono">{formatTime(selectedRecord.timestamp, true)}</span></div>
                <div>Epoch Unix ms: <span className="text-slate-400 font-mono">{selectedRecord.timestamp}</span></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setClientIp(selectedRecord.clientIp);
                  setSelectedRecord(null);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium text-center cursor-pointer"
              >
                Filter this Host
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch(selectedRecord.domain);
                  setSelectedRecord(null);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium text-center cursor-pointer"
              >
                Filter this Domain
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
