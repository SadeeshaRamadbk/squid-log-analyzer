'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  X,
  Search,
  RefreshCw,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { formatBytes, formatNumber, formatTime } from '@/lib/formatters';
import type { FlowRecord } from './LiveFlowsTable';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { exportToCsv } from '@/lib/exportCsv';

interface NetflowLiveFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIp?: string;
  onViewProfile?: (ip: string) => void;
  onViewPort?: (port: number, protocol?: string) => void;
}

export function NetflowLiveFeedModal({
  isOpen,
  onClose,
  initialIp,
  onViewProfile,
  onViewPort,
}: NetflowLiveFeedModalProps) {
  // Data state
  const [records, setRecords] = useState<FlowRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Auto-refresh interval (0 = paused, 2000 = 2s, 3000 = 3s, 10000 = 10s)
  const [refreshInterval, setRefreshInterval] = useState<number>(3000);
  const [selectedFlow, setSelectedFlow] = useState<FlowRecord | null>(null);

  // Filters state
  const [search, setSearch] = useState(initialIp || '');
  const [protocol, setProtocol] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [trafficType, setTrafficType] = useState<'all' | 'external' | 'internal'>('all');
  const [hideFirewallTraffic, setHideFirewallTraffic] = useState(true);
  const [hideProxyHop, setHideProxyHop] = useState(true);
  const [timeWindow, setTimeWindow] = useState<'30m' | '1h' | undefined>('30m');
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();

  useEffect(() => {
    if (initialIp) {
      setSearch(initialIp);
    }
  }, [initialIp]);

  // Fetch live flows
  const fetchFlows = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));

      if (search.trim()) params.set('search', search.trim());
      if (protocol) params.set('protocol', protocol);
      if (serviceName) params.set('serviceName', serviceName);
      if (trafficType !== 'all') params.set('trafficType', trafficType);
      params.set('hideFirewallTraffic', String(hideFirewallTraffic));
      params.set('hideProxyHop', String(hideProxyHop));

      if (timeWindow) {
        params.set('timeWindow', timeWindow);
      } else {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      const res = await fetch(`/api/netflow/flows?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRecords(json.data.records || []);
        setTotal(json.data.total || 0);
        setPage(json.data.page || 1);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching NetFlow live feed:', err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    search,
    protocol,
    serviceName,
    trafficType,
    hideFirewallTraffic,
    hideProxyHop,
    timeWindow,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchFlows(1);
    }
  }, [isOpen, fetchFlows]);

  // Auto-refresh timer
  useEffect(() => {
    if (!isOpen || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchFlows(page);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [isOpen, refreshInterval, page, fetchFlows]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedFlow) {
          setSelectedFlow(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedFlow, onClose]);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const exportData = records.map((f) => ({
      Timestamp: f.formattedTime,
      SourceIP: f.srcIp,
      SourcePort: f.srcPort,
      Username: f.userName || '',
      Department: f.department || '',
      DestinationIP: f.dstIp,
      DestinationPort: f.dstPort,
      Protocol: f.protocol,
      Service: f.serviceName,
      Direction: f.direction || 'external',
      Bytes: f.bytes,
      Packets: f.packets,
      TCPFlags: f.tcpFlags || '',
      DurationMs: f.flowDurationMs,
    }));
    const columns = [
      { key: 'Timestamp', header: 'Timestamp' },
      { key: 'SourceIP', header: 'Source IP' },
      { key: 'SourcePort', header: 'Source Port' },
      { key: 'Username', header: 'Username' },
      { key: 'Department', header: 'Department' },
      { key: 'DestinationIP', header: 'Destination IP' },
      { key: 'DestinationPort', header: 'Destination Port' },
      { key: 'Protocol', header: 'Protocol' },
      { key: 'Service', header: 'Service' },
      { key: 'Direction', header: 'Direction' },
      { key: 'Bytes', header: 'Bytes' },
      { key: 'Packets', header: 'Packets' },
      { key: 'TCPFlags', header: 'TCP Flags' },
      { key: 'DurationMs', header: 'Duration (ms)' },
    ];
    exportToCsv('netflow_live_feed', exportData, columns);
  };

  const resetFilters = () => {
    setSearch('');
    setProtocol('');
    setServiceName('');
    setTrafficType('all');
    setHideFirewallTraffic(true);
    setHideProxyHop(true);
    setTimeWindow('30m');
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || protocol || serviceName || trafficType !== 'all' || !hideFirewallTraffic || !hideProxyHop || timeWindow !== '30m' || startDate || endDate
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-[1550px] h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* ============================================================== */}
        {/* Header Bar */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Layers className={`w-5 h-5 ${refreshInterval > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  pfSense NetFlow Live Stream
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <span className={`w-1.5 h-1.5 rounded-full bg-indigo-400 ${refreshInterval > 0 ? 'animate-ping' : ''}`} />
                  {refreshInterval > 0 ? `Streaming (${refreshInterval / 1000}s)` : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Layer-3/4 IP packet telemetry, port inspection & bidirectional flow sessions
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
                  refreshInterval === 2000 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2s
              </button>
              <button
                type="button"
                onClick={() => setRefreshInterval(3000)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 3000 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3s
              </button>
              <button
                type="button"
                onClick={() => setRefreshInterval(10000)}
                className={`px-2 py-1 rounded transition-colors ${
                  refreshInterval === 10000 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                10s
              </button>
            </div>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => fetchFlows(page)}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
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
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IP, host, or service..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
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

            {/* Structured Selectors */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Traffic Type Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 text-[11px] font-medium">Flow:</span>
                <select
                  value={trafficType}
                  onChange={(e) => setTrafficType(e.target.value as any)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Traffic</option>
                  <option value="external" className="bg-slate-900 text-cyan-400">WAN / External</option>
                  <option value="internal" className="bg-slate-900 text-amber-400">East-West / LAN</option>
                </select>
              </div>

              {/* Protocol Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 text-[11px] font-medium">Proto:</span>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-200">All</option>
                  <option value="TCP" className="bg-slate-900 text-emerald-400">TCP</option>
                  <option value="UDP" className="bg-slate-900 text-purple-400">UDP</option>
                  <option value="ICMP" className="bg-slate-900 text-amber-400">ICMP</option>
                </select>
              </div>

              {/* Common Services */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 text-[11px] font-medium">Service:</span>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-200">All Services</option>
                  <option value="HTTPS" className="bg-slate-900 text-slate-200">HTTPS (443)</option>
                  <option value="DNS" className="bg-slate-900 text-slate-200">DNS (53)</option>
                  <option value="HTTP" className="bg-slate-900 text-slate-200">HTTP (80)</option>
                  <option value="SSH" className="bg-slate-900 text-slate-200">SSH (22)</option>
                  <option value="RDP" className="bg-slate-900 text-slate-200">RDP (3389)</option>
                  <option value="SMB" className="bg-slate-900 text-slate-200">SMB (445)</option>
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
                    timeWindow === '30m' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
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
                    timeWindow === '1h' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
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
                      ? 'bg-indigo-600 text-white'
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

              {/* Hide Firewall / Proxy Checkboxes */}
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideFirewallTraffic}
                  onChange={(e) => setHideFirewallTraffic(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
                />
                <span>Hide Firewall</span>
              </label>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideProxyHop}
                  onChange={(e) => setHideProxyHop(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
                />
                <span>Hide Proxy</span>
              </label>

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
                Matching Flows: <strong className="text-white font-mono">{formatNumber(total)}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Showing: <strong className="text-slate-200 font-mono">{records.length}</strong> flows on page{' '}
                <strong className="text-slate-200 font-mono">{page}</strong> of{' '}
                <strong className="text-slate-200 font-mono">{totalPages}</strong>
              </span>
            </div>
            <span className="text-slate-500 text-[10px] italic">
              Click any row to open the complete Socket Session Inspector
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Main Flow Table */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-auto bg-slate-950/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Source Socket</th>
                <th className="py-2.5 px-3">Destination Socket</th>
                <th className="py-2.5 px-3">Proto / Service</th>
                <th className="py-2.5 px-3 text-right">Packets</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
                <th className="py-2.5 px-4 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-sans">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Streaming live NetFlow packets...</span>
                      </div>
                    ) : (
                      <span>No NetFlow sessions matched your current filters.</span>
                    )}
                  </td>
                </tr>
              ) : (
                records.map((f) => {
                  const isInternal = f.direction === 'internal';
                  const isDownload = f.direction === 'download';

                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFlow(f)}
                      className={`hover:bg-slate-800/60 transition-colors cursor-pointer group ${
                        selectedFlow?.id === f.id ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      {/* Time */}
                      <td
                        className="py-2 px-4 whitespace-nowrap text-slate-400 text-[11px]"
                        title={formatTime(f.timestamp, true)}
                      >
                        {formatTime(f.timestamp)}
                      </td>

                      {/* Direction */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            ↔ Internal
                          </span>
                        ) : isDownload ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                            Inbound
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <ArrowUpRight className="w-3 h-3 text-purple-400" />
                            Outbound
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div>
                          {f.userName && (
                            <div className="font-sans font-semibold text-slate-200 text-xs">
                              {f.userName}
                            </div>
                          )}
                          <div className="text-[11px] text-amber-400 font-mono">
                            {f.srcIp}:{f.srcPort}
                          </div>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-cyan-300">
                        {f.dstIp}:{f.dstPort}
                      </td>

                      {/* Protocol / Service */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              f.protocol === 'TCP'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : f.protocol === 'UDP'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {f.protocol}
                          </span>
                          <span className="text-slate-200 font-sans font-medium text-xs">
                            {f.serviceName}
                          </span>
                        </div>
                      </td>

                      {/* Packets */}
                      <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {formatNumber(f.packets)}
                      </td>

                      {/* Duration */}
                      <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {f.flowDurationMs > 0 ? `${f.flowDurationMs}ms` : '<1ms'}
                      </td>

                      {/* Volume */}
                      <td className="py-2 px-4 text-right font-bold text-slate-100 whitespace-nowrap text-[11px]">
                        {formatBytes(f.bytes)}
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
              onClick={() => fetchFlows(1)}
              disabled={page <= 1 || loading}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First Page"
            >
              &laquo;
            </button>
            <button
              type="button"
              onClick={() => fetchFlows(page - 1)}
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
              onClick={() => fetchFlows(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fetchFlows(totalPages)}
              disabled={page >= totalPages || loading}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last Page"
            >
              &raquo;
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Flow Session Inspector Slide-Over */}
        {/* ============================================================== */}
        {selectedFlow && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col z-50 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">NetFlow Session Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFlow(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Socket Flow Sockets */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Socket Session Pair</span>
                  <span className="font-mono text-indigo-400 font-bold">{selectedFlow.protocol}</span>
                </div>
                
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Source Endpoint</div>
                    <div className="font-mono text-amber-400 font-bold text-xs">{selectedFlow.srcIp}</div>
                    <div className="font-mono text-slate-400 text-[11px]">Port {selectedFlow.srcPort}</div>
                  </div>
                  
                  <div className="text-slate-500 font-mono text-sm">&rarr;</div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-sans">Destination Endpoint</div>
                    <div className="font-mono text-cyan-300 font-bold text-xs">{selectedFlow.dstIp}</div>
                    <div className="font-mono text-slate-400 text-[11px]">Port {selectedFlow.dstPort}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Service: <strong className="text-white">{selectedFlow.serviceName}</strong></span>
                  {onViewPort && (
                    <button
                      type="button"
                      onClick={() => onViewPort(selectedFlow.dstPort, selectedFlow.protocol)}
                      className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      Port {selectedFlow.dstPort} Diagnostics
                    </button>
                  )}
                </div>
              </div>

              {/* Host & Employee Mapping */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Host Identity
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">Identified User:</span>
                    <div className="text-slate-200 font-medium">{selectedFlow.userName || 'Unassigned Workstation'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Department:</span>
                    <div className="text-slate-200">{selectedFlow.department || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    {onViewProfile && (
                      <button
                        type="button"
                        onClick={() => onViewProfile(selectedFlow.srcIp)}
                        className="text-cyan-400 hover:underline block cursor-pointer mt-1"
                      >
                        Open Source Host Telemetry Dossier &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Flow Metrics */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Session Performance & Volume
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Total Volume</span>
                    <span className="font-bold text-white font-mono">
                      {formatBytes(selectedFlow.bytes)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Total Packets</span>
                    <span className="font-bold text-indigo-400 font-mono">
                      {formatNumber(selectedFlow.packets)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Duration</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {selectedFlow.flowDurationMs > 0 ? `${selectedFlow.flowDurationMs}ms` : '<1ms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Protocol Details & TCP Flags */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Packet Headers & TCP Control Flags
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">TCP Flags Hex/Str:</span>
                    <div className="font-mono text-amber-400 font-bold">{selectedFlow.tcpFlags || 'None (UDP/ICMP)'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Avg Packet Size:</span>
                    <div className="font-mono text-slate-200">
                      {selectedFlow.packets > 0 ? formatBytes(Math.round(selectedFlow.bytes / selectedFlow.packets)) : '0 B'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>Timestamp: <span className="text-slate-200 font-mono">{formatTime(selectedFlow.timestamp, true)}</span></div>
                <div>Epoch Unix ms: <span className="text-slate-400 font-mono">{selectedFlow.timestamp}</span></div>
                <div>Flow ID: <span className="text-slate-400 font-mono">#{selectedFlow.id}</span></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearch(selectedFlow.srcIp);
                  setSelectedFlow(null);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium text-center cursor-pointer"
              >
                Filter Source IP
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch(selectedFlow.dstIp);
                  setSelectedFlow(null);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium text-center cursor-pointer"
              >
                Filter Dest IP
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
