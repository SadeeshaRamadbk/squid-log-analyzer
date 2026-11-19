'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Laptop,
  Search,
  Building,
  Filter,
  ArrowUpDown,
  Download,
  RotateCw,
  Columns2,
  Table as TableIcon,
  ShieldAlert,
  Terminal,
  Globe,
  User,
} from 'lucide-react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { HostMetricsBar } from '@/components/hosts/HostMetricsBar';
import { HostTable } from '@/components/hosts/HostTable';
import { HostDetailBreakdown } from '@/components/hosts/HostDetailBreakdown';
import type { HostsOverviewResult, HostSummaryItem } from '@/lib/db/profile-queries';

export default function HostsPage() {
  const [data, setData] = useState<HostsOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'mapped' | 'unmapped' | 'blocked' | 'firewall'>('all');
  const [sortBy, setSortBy] = useState<'bandwidth' | 'requests' | 'blocked' | 'firewall' | 'ip' | 'name'>('bandwidth');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');

  // Selected Host for 360° breakdown
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (department !== 'all') params.set('department', department);
      if (filterType !== 'all') params.set('filter', filterType);
      params.set('sort', sortBy);
      params.set('direction', sortDirection);
      params.set('limit', '150');

      const res = await fetch(`/api/hosts?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        // Automatically select the first host if none is selected
        if (!selectedIp && json.data.hosts.length > 0) {
          setSelectedIp(json.data.hosts[0].clientIp);
        }
      } else {
        setError(json.error || 'Failed to load hosts');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading hosts overview');
    } finally {
      setLoading(false);
    }
  }, [search, department, filterType, sortBy, sortDirection, selectedIp]);

  useEffect(() => {
    document.title = 'Hosts & Employee Telemetry - Nippon BPO NOC';
    fetchHosts();
  }, [fetchHosts]);

  const maxBandwidth = useMemo(() => {
    if (!data?.hosts || data.hosts.length === 0) return 1;
    return Math.max(...data.hosts.map((h) => h.totalBandwidth));
  }, [data]);

  const handleExportCsv = () => {
    if (!data?.hosts || data.hosts.length === 0) return;

    const headers = [
      'Client IP',
      'Employee Name',
      'Department',
      'Total Bandwidth (Bytes)',
      'Squid Web Requests',
      'Squid Web Bytes',
      'Squid Blocked Requests',
      'Squid Top Domain',
      'NetFlow Total Flows',
      'NetFlow Download Bytes',
      'NetFlow Upload Bytes',
      'NetFlow Top Service',
      'Syslog Total Events',
      'Syslog Firewall Blocks',
    ];

    const rows = data.hosts.map((h) => [
      `"${h.clientIp}"`,
      `"${h.userName || ''}"`,
      `"${h.department || ''}"`,
      h.totalBandwidth,
      h.squid.totalRequests,
      h.squid.totalBytes,
      h.squid.blockedCount,
      `"${h.squid.topDomain || ''}"`,
      h.netflow.totalFlows,
      h.netflow.downloadBytes,
      h.netflow.uploadBytes,
      `"${h.netflow.topService || ''}"`,
      h.syslog.totalEvents,
      h.syslog.firewallBlocks,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hosts_Telemetry_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppHeader activeView="hosts" />

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Section Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Laptop className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Host & Employee Telemetry Directory
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Squid + NetFlow + Syslog
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centralized inspection of every workstation host: data consumption, visited websites, Layer 3/4 flows, and firewall security blocks.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!data || data.hosts.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchHosts}
              disabled={loading}
              className="p-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RotateCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI Metrics Summary Bar */}
        {data && <HostMetricsBar kpis={data.kpis} />}

        {/* Toolbar: Search, Filters, Sorters & View Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by IP, employee name, department, or domain..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            {data && data.departments.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  <option value="unassigned">Unassigned Hosts</option>
                  {data.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Filter Buttons & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Type Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({data?.totalFiltered || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('mapped')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'mapped' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Assigned
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unmapped')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'unmapped' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unassigned
              </button>
              <button
                type="button"
                onClick={() => setFilterType('blocked')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'blocked' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Web Blocked
              </button>
              <button
                type="button"
                onClick={() => setFilterType('firewall')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'firewall' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Firewall Drops
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 gap-1 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="bandwidth">Total Bandwidth</option>
                <option value="requests">Web Requests</option>
                <option value="blocked">Web Blocks</option>
                <option value="firewall">Firewall Drops</option>
                <option value="ip">IP Address</option>
                <option value="name">Employee Name</option>
              </select>
            </div>

            {/* View Mode Toggle: Split vs Table */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'split' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Split View (Directory + 360° Breakdown)"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchHosts}
              className="underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Layout Area */}
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Master Hosts List */}
            <div className="lg:col-span-7 xl:col-span-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Showing {data?.hosts.length || 0} of {data?.totalFiltered || 0} matching hosts
                </span>
                <span>Click a row to inspect full dossier</span>
              </div>
              <HostTable
                hosts={data?.hosts || []}
                selectedIp={selectedIp}
                onSelectHost={(ip) => setSelectedIp(ip)}
                maxBandwidth={maxBandwidth}
              />
            </div>

            {/* Right Column: 360° Detailed Breakdown for Selected Host */}
            <div className="lg:col-span-5 xl:col-span-6 sticky top-20">
              {selectedIp ? (
                <HostDetailBreakdown
                  ip={selectedIp}
                  onUpdatedMapping={fetchHosts}
                />
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                  <Laptop className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs">Select a host from the table to inspect detailed data usage, sites visited, and security logs.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table-Only View */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing {data?.hosts.length || 0} of {data?.totalFiltered || 0} matching hosts
              </span>
              <span>Click any host to open its 360° breakdown</span>
            </div>
            <HostTable
              hosts={data?.hosts || []}
              selectedIp={selectedIp}
              onSelectHost={(ip) => {
                setSelectedIp(ip);
                setViewMode('split');
              }}
              maxBandwidth={maxBandwidth}
            />
          </div>
        )}
      </main>
    </div>
  );
}
