'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SyslogMetrics } from '@/components/syslog/SyslogMetrics';
import { SyslogCharts } from '@/components/syslog/SyslogCharts';
import { SyslogFilters } from '@/components/syslog/SyslogFilters';
import { SyslogTable } from '@/components/syslog/SyslogTable';
import { FirewallBlocksView } from '@/components/syslog/FirewallBlocksView';
import { PfSenseSyslogModal } from '@/components/syslog/PfSenseSyslogModal';
import { BackupRestoreModal } from '@/components/dashboard/BackupRestoreModal';
import { IpMappingModal } from '@/components/dashboard/IpMappingModal';
import { ShieldAlert, ListFilter } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import type { SyslogEventRow, SyslogOverviewStats, FirewallBlocksOverview } from '@/lib/db/syslog-queries';

export default function SyslogPage() {
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    document.title = 'pfSense Syslog - Squid Analyzer';
  }, []);

  // Filters State (default to Today)
  const [activeTab, setActiveTab] = useState<'stream' | 'blocks'>('stream');
  const [suppressNoise, setSuppressNoise] = useState(true);
  const [blocksData, setBlocksData] = useState<FirewallBlocksOverview | null>(null);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const [search, setSearch] = useState('');
  const [severityLevel, setSeverityLevel] = useState<'all' | 'errors' | 'warnings' | 'notices' | 'info'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'block' | 'pass'>('all');
  const [selectedApp, setSelectedApp] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [page, setPage] = useState(1);
  const [isRealtime, setIsRealtime] = useState(true);

  // Data States
  const [events, setEvents] = useState<SyslogEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<SyslogOverviewStats | null>(null);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Modal States
  const [isSyslogConfigOpen, setIsSyslogConfigOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Fetch paginated events
  const fetchEvents = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoadingEvents(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
          includeFilters: 'true',
        });

        if (search.trim()) params.set('search', search.trim());
        if (severityLevel !== 'all') params.set('severityLevel', severityLevel);
        if (actionFilter !== 'all') params.set('action', actionFilter);
        if (selectedApp) params.set('appName', selectedApp);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/syslog?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch events');

        const json = await res.json();
        if (json.success) {
          setEvents(json.data);
          setTotal(json.pagination.total);
          setTotalPages(json.pagination.totalPages);

          if (json.filterOptions?.apps) {
            setAvailableApps(json.filterOptions.apps);
          }
        }
      } catch (err) {
        console.error('Error fetching syslog events:', err);
      } finally {
        if (!isSilent) setLoadingEvents(false);
      }
    },
    [page, search, severityLevel, actionFilter, selectedApp, startDate, endDate]
  );

  // 2. Fetch statistics & timeline
  const fetchStats = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoadingStats(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/syslog/stats?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch stats');

        const json = await res.json();
        if (json.success) {
          setStats(json.stats);
        }
      } catch (err) {
        console.error('Error fetching syslog stats:', err);
      } finally {
        if (!isSilent) setLoadingStats(false);
      }
    },
    [startDate, endDate]
  );

  // 3. Fetch firewall blocks intelligence
  const fetchBlocksData = useCallback(async () => {
    try {
      setLoadingBlocks(true);
      const params = new URLSearchParams({
        suppressNoise: suppressNoise ? 'true' : 'false',
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/syslog/blocks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch firewall blocks');
      const json = await res.json();
      if (json.success) {
        setBlocksData(json.data);
      }
    } catch (err) {
      console.error('Error fetching firewall blocks:', err);
    } finally {
      setLoadingBlocks(false);
    }
  }, [startDate, endDate, suppressNoise]);

  // Load data on filter changes
  useEffect(() => {
    fetchEvents();
    fetchStats();
    if (activeTab === 'blocks') {
      fetchBlocksData();
    }
  }, [fetchEvents, fetchStats, fetchBlocksData, activeTab]);

  // Real-time SSE Live Stream
  useEffect(() => {
    if (!isRealtime) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const sse = new EventSource('/api/syslog/stream');
    eventSourceRef.current = sse;

    sse.addEventListener('syslog', (e) => {
      try {
        const incoming: SyslogEventRow = JSON.parse(e.data);

        // Prepend new event if on page 1 and matches active search/app filter
        setEvents((prev) => {
          if (page !== 1) return prev;
          if (selectedApp && incoming.app_name !== selectedApp) return prev;
          if (search && !incoming.message.toLowerCase().includes(search.toLowerCase())) return prev;

          // Keep max 100 in view
          const updated = [incoming, ...prev];
          return updated.slice(0, 50);
        });

        setTotal((prev) => prev + 1);
      } catch (err) {
        console.warn('SSE syslog parse error:', err);
      }
    });

    sse.onerror = () => {
      console.warn('Syslog SSE connection error. Reconnecting...');
    };

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, [isRealtime, page, selectedApp, search]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const handleSeverityChange = (level: 'all' | 'errors' | 'warnings' | 'notices' | 'info') => {
    setSeverityLevel(level);
    setPage(1);
  };

  const handleAppChange = (app: string) => {
    setSelectedApp(app);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchEvents();
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* App Header */}
      <AppHeader
        activeView="syslog"
        onOpenSyslogConfig={() => setIsSyslogConfigOpen(true)}
        onOpenIpModal={() => setIsIpModalOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
      />

      {/* Main Body */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 focus:outline-none">
        <h1 className="sr-only">pfSense Syslog &amp; Security Events</h1>
        {/* Metric Cards */}
        <SyslogMetrics stats={stats} isLoading={loadingStats} />

        {/* Severity Timeline & Top Daemons Charts */}
        {stats && (
          <SyslogCharts
            timeline={stats.timeline}
            topApps={stats.topApps}
            selectedApp={selectedApp}
            onSelectApp={handleAppChange}
          />
        )}

        {/* Sub-View Switcher: Live Stream vs Firewall Blocks Intelligence */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stream'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Live Log Stream & Search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('blocks');
              fetchBlocksData();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'blocks'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Firewall Blocks View (filterlog)</span>
            {stats && stats.firewallBlocks > 0 && (
              <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-rose-950 text-rose-300 border border-rose-800/80">
                {formatNumber(stats.firewallBlocks)}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'stream' ? (
          <>
            {/* Filters Bar */}
            <SyslogFilters
              search={search}
              onSearchChange={handleSearchChange}
              severityLevel={severityLevel}
              onSeverityChange={handleSeverityChange}
              actionFilter={actionFilter}
              onActionChange={(act) => {
                setActionFilter(act);
                setPage(1);
              }}
              selectedApp={selectedApp}
              onAppChange={handleAppChange}
              availableApps={availableApps}
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
              isRealtime={isRealtime}
              onToggleRealtime={() => setIsRealtime(!isRealtime)}
              onRefresh={handleRefresh}
              isLoading={loadingEvents}
            />

            {/* Live Syslog Stream Table */}
            <SyslogTable
              events={events}
              total={total}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={loadingEvents}
            />
          </>
        ) : (
          <FirewallBlocksView
            data={blocksData}
            isLoading={loadingBlocks}
            suppressNoise={suppressNoise}
            onToggleSuppressNoise={() => setSuppressNoise(!suppressNoise)}
          />
        )}
      </main>

      {/* pfSense Setup Modal */}
      <PfSenseSyslogModal
        isOpen={isSyslogConfigOpen}
        onClose={() => setIsSyslogConfigOpen(false)}
      />

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onRestored={handleRefresh}
      />

      {/* IP Mappings Modal */}
      <IpMappingModal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        onMappingsChanged={handleRefresh}
      />
    </div>
  );
}
