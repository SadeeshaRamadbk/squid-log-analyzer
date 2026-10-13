'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { RequestsChart } from '@/components/dashboard/RequestsChart';
import { TopDomainsTable } from '@/components/dashboard/TopDomainsTable';
import { TopClientsTable } from '@/components/dashboard/TopClientsTable';
import { BlockedRequestsList, BlockedRecord } from '@/components/dashboard/BlockedRequestsList';
import { LiveRequestsTable } from '@/components/dashboard/LiveRequestsTable';
import { SquidConfigModal } from '@/components/dashboard/SquidConfigModal';
import { RetentionBanner } from '@/components/dashboard/RetentionBanner';
import { IpMappingModal } from '@/components/dashboard/IpMappingModal';
import { BackupRestoreModal } from '@/components/dashboard/BackupRestoreModal';
import { IpProfileModal } from '@/components/profile/IpProfileModal';
import { PfSenseConfigModal } from '@/components/softflowd/PfSenseConfigModal';
import { SoftflowdMetrics } from '@/components/softflowd/SoftflowdMetrics';
import { SoftflowdFilters } from '@/components/softflowd/SoftflowdFilters';
import { ThroughputChart } from '@/components/softflowd/ThroughputChart';
import { TopTalkersTable } from '@/components/softflowd/TopTalkersTable';
import { TopDestinationsTable } from '@/components/softflowd/TopDestinationsTable';
import { TopServicesTable } from '@/components/softflowd/TopServicesTable';
import { LiveFlowsTable, FlowRecord } from '@/components/softflowd/LiveFlowsTable';
import { DomainDetailModal } from '@/components/profile/DomainDetailModal';
import { PortDetailModal } from '@/components/profile/PortDetailModal';
import { GlobalFilterBar, GlobalFilterState } from '@/components/navigation/GlobalFilterBar';
import { FailedRequestsCard } from '@/components/dashboard/FailedRequestsCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { BlockDomainModal } from '@/components/dashboard/BlockDomainModal';
import { ScheduledReportsModal } from '@/components/dashboard/ScheduledReportsModal';
import { Radio, ShieldAlert, Network, Shield, Columns2 } from 'lucide-react';
import type { LiveRequestRecord } from '@/lib/db/queries';

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as 'squid' | 'softflowd' | 'split') || 'squid';

  // Multitasking View Mode: 'squid' | 'softflowd' | 'split'
  const [activeView, setActiveView] = useState<'squid' | 'softflowd' | 'split'>(initialView);

  // Filter sync across panels
  const [isFilterSynced, setIsFilterSynced] = useState(true);

  // Real-Time auto-update state
  const [isRealTime, setIsRealTime] = useState(false);

  // Squid Filter state
  const [squidFilters, setSquidFilters] = useState<{
    startDate?: string;
    endDate?: string;
    clientIp?: string;
    timeWindow?: '30m' | '1h';
  }>({});

  // Softflowd Filter state
  const [softflowdFilters, setSoftflowdFilters] = useState<{
    startDate?: string;
    endDate?: string;
    srcIp?: string;
    dstIp?: string;
    protocol?: string;
    serviceName?: string;
    timeWindow?: '30m' | '1h';
    hideFirewallTraffic?: boolean;
    hideProxyHop?: boolean;
    trafficType?: 'all' | 'external' | 'internal';
  }>({
    hideFirewallTraffic: true,
    hideProxyHop: true,
    trafficType: 'all',
  });

  // Tab state for Squid lower panel (Live stream vs Blocked requests)
  const [squidLogTab, setSquidLogTab] = useState<'live' | 'blocked'>('live');

  // Modals state
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSquidConfigOpen, setIsSquidConfigOpen] = useState(false);
  const [isPfSenseConfigOpen, setIsPfSenseConfigOpen] = useState(false);
  const [targetIpForModal, setTargetIpForModal] = useState<string | undefined>(undefined);
  const [profileModalIp, setProfileModalIp] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<{ port: number; protocol?: string } | null>(null);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [blockModalDomain, setBlockModalDomain] = useState<string | null>(null);
  const [correlatedIp, setCorrelatedIp] = useState<string | null>(null);
  const [liveReqLimit, setLiveReqLimit] = useState(25);
  const [blockedLimit, setBlockedLimit] = useState(25);
  const [flowLimit, setFlowLimit] = useState(25);

  // Squid Stats state
  const [loadingSquid, setLoadingSquid] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [squidStats, setSquidStats] = useState<{
    overview: {
      totalRequests: number;
      totalBytes: number;
      downloadBytes?: number;
      uploadBytes?: number;
      blockedRequests: number;
      uniqueDomains: number;
      uniqueClients: number;
    };
    topDomains: any[];
    topClients: any[];
    requestsOverTime: any[];
    filterOptions: {
      availableClientIps: Array<string | { clientIp: string; userName?: string | null; department?: string | null }>;
      minDate: string | null;
      maxDate: string | null;
    };
  }>({
    overview: {
      totalRequests: 0,
      totalBytes: 0,
      blockedRequests: 0,
      uniqueDomains: 0,
      uniqueClients: 0,
    },
    topDomains: [],
    topClients: [],
    requestsOverTime: [],
    filterOptions: {
      availableClientIps: [],
      minDate: null,
      maxDate: null,
    },
  });

  // Squid Live Requests state
  const [liveReqPage, setLiveReqPage] = useState(1);
  const [liveReqData, setLiveReqData] = useState<{
    records: LiveRequestRecord[];
    total: number;
    totalPages: number;
  }>({
    records: [],
    total: 0,
    totalPages: 1,
  });
  const [loadingLiveReq, setLoadingLiveReq] = useState(false);

  // Squid Blocked Requests state
  const [blockedPage, setBlockedPage] = useState(1);
  const [blockedData, setBlockedData] = useState<{
    records: BlockedRecord[];
    total: number;
    totalPages: number;
  }>({
    records: [],
    total: 0,
    totalPages: 1,
  });
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Softflowd Stats state
  const [loadingNetflow, setLoadingNetflow] = useState(true);
  const [netflowStats, setNetflowStats] = useState<{
    overview: {
      totalFlows: number;
      totalBytes: number;
      downloadBytes: number;
      uploadBytes: number;
      totalPackets: number;
      uniqueSrcIps: number;
      uniqueDstIps: number;
      topProtocol: string;
    };
    throughput: any[];
    topTalkers: any[];
    topDestinations: any[];
    internalTraffic: any[];
    topServices: any[];
    protocols: any[];
    filterOptions: {
      protocols: string[];
      services: string[];
      availableClientIps: Array<string | { clientIp: string; userName?: string | null; department?: string | null }>;
      minDate: string | null;
      maxDate: string | null;
    };
  }>({
    overview: {
      totalFlows: 0,
      totalBytes: 0,
      downloadBytes: 0,
      uploadBytes: 0,
      totalPackets: 0,
      uniqueSrcIps: 0,
      uniqueDstIps: 0,
      topProtocol: 'TCP',
    },
    throughput: [],
    topTalkers: [],
    topDestinations: [],
    internalTraffic: [],
    topServices: [],
    protocols: [],
    filterOptions: {
      protocols: [],
      services: [],
      availableClientIps: [],
      minDate: null,
      maxDate: null,
    },
  });

  // Softflowd Flows state
  const [flowPage, setFlowPage] = useState(1);
  const [flowData, setFlowData] = useState<{
    records: FlowRecord[];
    total: number;
    totalPages: number;
  }>({
    records: [],
    total: 0,
    totalPages: 1,
  });
  const [loadingFlows, setLoadingFlows] = useState(false);

  // Fetch Squid Stats
  const fetchSquidStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (squidFilters.startDate) params.set('startDate', squidFilters.startDate);
      if (squidFilters.endDate) params.set('endDate', squidFilters.endDate);
      if (squidFilters.clientIp) params.set('clientIp', squidFilters.clientIp);
      if (squidFilters.timeWindow) params.set('timeWindow', squidFilters.timeWindow);

      const res = await fetch(`/api/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSquidStats(json.data);
      }
    } catch (err) {
      console.error('Failed to load Squid stats:', err);
    }
  }, [squidFilters]);

  // Fetch Squid Live Requests
  const fetchLiveRequests = useCallback(async (page = 1) => {
    setLoadingLiveReq(true);
    try {
      const params = new URLSearchParams();
      if (squidFilters.startDate) params.set('startDate', squidFilters.startDate);
      if (squidFilters.endDate) params.set('endDate', squidFilters.endDate);
      if (squidFilters.clientIp) params.set('clientIp', squidFilters.clientIp);
      if (squidFilters.timeWindow) params.set('timeWindow', squidFilters.timeWindow);
      params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLiveReqData({
          records: json.data.records,
          total: json.data.total,
          totalPages: json.data.totalPages,
        });
        setLiveReqPage(page);
      }
    } catch (err) {
      console.error('Failed to load live requests:', err);
    } finally {
      setLoadingLiveReq(false);
    }
  }, [squidFilters]);

  // Fetch Squid Blocked Requests
  const fetchBlocked = useCallback(async (page = 1) => {
    setLoadingBlocked(true);
    try {
      const params = new URLSearchParams();
      if (squidFilters.startDate) params.set('startDate', squidFilters.startDate);
      if (squidFilters.endDate) params.set('endDate', squidFilters.endDate);
      if (squidFilters.clientIp) params.set('clientIp', squidFilters.clientIp);
      if (squidFilters.timeWindow) params.set('timeWindow', squidFilters.timeWindow);
      params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/blocked?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setBlockedData({
          records: json.data.records,
          total: json.data.total,
          totalPages: json.data.totalPages,
        });
        setBlockedPage(page);
      }
    } catch (err) {
      console.error('Failed to load blocked logs:', err);
    } finally {
      setLoadingBlocked(false);
    }
  }, [squidFilters]);

  // Fetch NetFlow Stats
  const fetchNetflowStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (softflowdFilters.startDate) params.set('startDate', softflowdFilters.startDate);
      if (softflowdFilters.endDate) params.set('endDate', softflowdFilters.endDate);
      if (softflowdFilters.srcIp) params.set('srcIp', softflowdFilters.srcIp);
      if (softflowdFilters.dstIp) params.set('dstIp', softflowdFilters.dstIp);
      if (softflowdFilters.protocol) params.set('protocol', softflowdFilters.protocol);
      if (softflowdFilters.serviceName) params.set('serviceName', softflowdFilters.serviceName);
      if (softflowdFilters.timeWindow) params.set('timeWindow', softflowdFilters.timeWindow);
      if (softflowdFilters.hideFirewallTraffic !== undefined) params.set('hideFirewallTraffic', String(softflowdFilters.hideFirewallTraffic));
      if (softflowdFilters.hideProxyHop !== undefined) params.set('hideProxyHop', String(softflowdFilters.hideProxyHop));
      if (softflowdFilters.trafficType) params.set('trafficType', softflowdFilters.trafficType);

      const res = await fetch(`/api/netflow/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setNetflowStats(json.data);
      }
    } catch (err) {
      console.error('Failed to load NetFlow stats:', err);
    }
  }, [softflowdFilters]);

  // Fetch NetFlow Flows
  const fetchFlows = useCallback(async (page = 1) => {
    setLoadingFlows(true);
    try {
      const params = new URLSearchParams();
      if (softflowdFilters.startDate) params.set('startDate', softflowdFilters.startDate);
      if (softflowdFilters.endDate) params.set('endDate', softflowdFilters.endDate);
      if (softflowdFilters.srcIp) params.set('srcIp', softflowdFilters.srcIp);
      if (softflowdFilters.dstIp) params.set('dstIp', softflowdFilters.dstIp);
      if (softflowdFilters.protocol) params.set('protocol', softflowdFilters.protocol);
      if (softflowdFilters.serviceName) params.set('serviceName', softflowdFilters.serviceName);
      if (softflowdFilters.timeWindow) params.set('timeWindow', softflowdFilters.timeWindow);
      if (softflowdFilters.hideFirewallTraffic !== undefined) params.set('hideFirewallTraffic', String(softflowdFilters.hideFirewallTraffic));
      if (softflowdFilters.hideProxyHop !== undefined) params.set('hideProxyHop', String(softflowdFilters.hideProxyHop));
      if (softflowdFilters.trafficType) params.set('trafficType', softflowdFilters.trafficType);
      params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/netflow/flows?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setFlowData({
          records: json.data.records,
          total: json.data.total,
          totalPages: json.data.totalPages,
        });
        setFlowPage(page);
      }
    } catch (err) {
      console.error('Failed to load flows:', err);
    } finally {
      setLoadingFlows(false);
    }
  }, [softflowdFilters]);

  // Initial Load for Squid
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoadingSquid(true);
      await Promise.all([fetchSquidStats(), fetchLiveRequests(1), fetchBlocked(1)]);
      if (isMounted) setLoadingSquid(false);
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [fetchSquidStats, fetchLiveRequests, fetchBlocked]);

  // Initial Load for NetFlow
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoadingNetflow(true);
      await Promise.all([fetchNetflowStats(), fetchFlows(1)]);
      if (isMounted) setLoadingNetflow(false);
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [fetchNetflowStats, fetchFlows]);

  // Real-Time Server-Sent Events (SSE) Effect with tab visibility pause & fallback
  useEffect(() => {
    if (!isRealTime) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const triggerRefresh = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (activeView === 'squid' || activeView === 'split') {
        fetchSquidStats();
        if (squidLogTab === 'live') fetchLiveRequests(liveReqPage);
        else fetchBlocked(blockedPage);
      }
      if (activeView === 'softflowd' || activeView === 'split') {
        fetchNetflowStats();
        fetchFlows(flowPage);
      }
    };

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(triggerRefresh, 3000);
    };

    const stopAll = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const startStreaming = () => {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        startFallbackPolling();
        return;
      }

      try {
        eventSource = new EventSource('/api/live/stream');
        eventSource.addEventListener('heartbeat', () => {
          triggerRefresh();
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startFallbackPolling();
        };
      } catch {
        startFallbackPolling();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAll();
      } else {
        triggerRefresh();
        startStreaming();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (typeof document !== 'undefined' && !document.hidden) {
      startStreaming();
    }

    return () => {
      stopAll();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    isRealTime,
    activeView,
    squidLogTab,
    fetchSquidStats,
    fetchLiveRequests,
    liveReqPage,
    fetchBlocked,
    blockedPage,
    fetchNetflowStats,
    fetchFlows,
    flowPage,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSquidStats(),
      fetchLiveRequests(liveReqPage),
      fetchBlocked(blockedPage),
      fetchNetflowStats(),
      fetchFlows(flowPage),
    ]);
    setRefreshing(false);
  };

  // Synchronized Filter Handler
  const handleSquidFilterChange = (newFilters: {
    startDate?: string;
    endDate?: string;
    clientIp?: string;
    timeWindow?: '30m' | '1h';
  }) => {
    setSquidFilters(newFilters);
    setLiveReqPage(1);
    setBlockedPage(1);

    if (isFilterSynced) {
      setSoftflowdFilters((prev) => ({
        ...prev,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
        srcIp: newFilters.clientIp,
        timeWindow: newFilters.timeWindow,
      }));
      setFlowPage(1);
    }
  };

  const handleSoftflowdFilterChange = (newFilters: {
    startDate?: string;
    endDate?: string;
    srcIp?: string;
    dstIp?: string;
    protocol?: string;
    serviceName?: string;
    timeWindow?: '30m' | '1h';
  }) => {
    setSoftflowdFilters(newFilters);
    setFlowPage(1);

    if (isFilterSynced) {
      setSquidFilters((prev) => ({
        ...prev,
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
        clientIp: newFilters.srcIp,
        timeWindow: newFilters.timeWindow,
      }));
      setLiveReqPage(1);
      setBlockedPage(1);
    }
  };

  const handleSelectClientIp = (ip: string) => {
    handleSquidFilterChange({ ...squidFilters, clientIp: ip });
  };

  const handleGlobalFilterChange = (newFilters: GlobalFilterState) => {
    setSquidFilters((prev) => ({
      ...prev,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      clientIp: newFilters.clientIp,
      timeWindow: newFilters.timeWindow,
    }));
    setSoftflowdFilters((prev) => ({
      ...prev,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      srcIp: newFilters.clientIp,
      protocol: newFilters.protocol,
      serviceName: newFilters.serviceName,
      timeWindow: newFilters.timeWindow,
      trafficType: newFilters.trafficType ?? prev.trafficType,
      hideFirewallTraffic: newFilters.hideFirewallTraffic ?? prev.hideFirewallTraffic,
      hideProxyHop: newFilters.hideProxyHop ?? prev.hideProxyHop,
    }));
    setLiveReqPage(1);
    setBlockedPage(1);
    setFlowPage(1);
  };

  const handleOpenIpAliasModal = (ip?: string) => {
    setTargetIpForModal(ip);
    setIsIpModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Shared Navigation Bar */}
      <AppHeader
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        onOpenIpModal={() => handleOpenIpAliasModal()}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenConfigModal={() => setIsPfSenseConfigOpen(true)}
        onOpenSquidConfig={() => setIsSquidConfigOpen(true)}
        onSelectProfile={(ip) => setProfileModalIp(ip)}
        onSelectDomain={(domain) => setSelectedDomain(domain)}
        onSelectPort={(port, protocol) => setSelectedPort({ port, protocol })}
        onOpenReportsModal={() => setIsReportsModalOpen(true)}
        isFilterSynced={isFilterSynced}
        onToggleFilterSync={() => setIsFilterSynced((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Retention & DB Status Banner */}
        <RetentionBanner onRetentionTriggered={handleRefresh} />

        {/* Security Alerts & Anomalies Feed */}
        <AlertsPanel onSelectIp={(ip) => setProfileModalIp(ip)} />

        {/* Global Time Range & Unified Filter Bar with Removable Chips */}
        <GlobalFilterBar
          filters={{
            startDate: isFilterSynced ? (squidFilters.startDate || softflowdFilters.startDate) : (activeView === 'softflowd' ? softflowdFilters.startDate : squidFilters.startDate),
            endDate: isFilterSynced ? (squidFilters.endDate || softflowdFilters.endDate) : (activeView === 'softflowd' ? softflowdFilters.endDate : squidFilters.endDate),
            timeWindow: isFilterSynced ? (squidFilters.timeWindow || softflowdFilters.timeWindow) : (activeView === 'softflowd' ? softflowdFilters.timeWindow : squidFilters.timeWindow),
            clientIp: isFilterSynced ? (squidFilters.clientIp || softflowdFilters.srcIp) : (activeView === 'softflowd' ? softflowdFilters.srcIp : squidFilters.clientIp),
            protocol: softflowdFilters.protocol,
            serviceName: softflowdFilters.serviceName,
            trafficType: softflowdFilters.trafficType,
            hideFirewallTraffic: softflowdFilters.hideFirewallTraffic,
            hideProxyHop: softflowdFilters.hideProxyHop,
          }}
          onFilterChange={handleGlobalFilterChange}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
          isRealTime={isRealTime}
          onToggleRealTime={() => setIsRealTime((prev) => !prev)}
          isFilterSynced={isFilterSynced}
          onToggleFilterSync={() => setIsFilterSynced((prev) => !prev)}
          availableClientIps={netflowStats.filterOptions.availableClientIps || squidStats.filterOptions.availableClientIps}
          availableProtocols={netflowStats.filterOptions.protocols}
          availableServices={netflowStats.filterOptions.services}
          activeView={activeView}
        />

        {/* ========================================================
            VIEW MODE 1: SQUID PROXY (HTTP/S FOCUSED VIEW)
           ======================================================== */}
        {activeView === 'squid' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Global Squid Filter Bar with 30m preset & Real-Time Toggle */}
            <DashboardFilters
              startDate={squidFilters.startDate}
              endDate={squidFilters.endDate}
              clientIp={squidFilters.clientIp}
              timeWindow={squidFilters.timeWindow}
              availableClientIps={squidStats.filterOptions.availableClientIps}
              minDate={squidStats.filterOptions.minDate}
              maxDate={squidStats.filterOptions.maxDate}
              onFilterChange={handleSquidFilterChange}
              onRefresh={handleRefresh}
              isRefreshing={refreshing}
              isRealTime={isRealTime}
              onToggleRealTime={() => setIsRealTime((prev) => !prev)}
            />

            {/* Overview Metric Cards (Now with separated Download ⬇️ and Upload ⬆️) */}
            <OverviewMetrics metrics={squidStats.overview} isLoading={loadingSquid} />

            {/* Requests Over Time Chart */}
            <RequestsChart data={squidStats.requestsOverTime} />

            {/* Failed Requests / Error Rate Card & Breakdown */}
            <FailedRequestsCard
              startDate={squidFilters.startDate}
              endDate={squidFilters.endDate}
              clientIp={squidFilters.clientIp}
              timeWindow={squidFilters.timeWindow}
              onSelectIp={handleSelectClientIp}
              onSelectDomain={(domain) => setSelectedDomain(domain)}
            />

            {/* Top Domains & Top Client IPs Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopDomainsTable
                domains={squidStats.topDomains}
                onViewDomain={(domain) => setSelectedDomain(domain)}
                onBlockDomain={(domain) => setBlockModalDomain(domain)}
              />
              <TopClientsTable
                clients={squidStats.topClients}
                onSelectIp={handleSelectClientIp}
                onEditAlias={handleOpenIpAliasModal}
                onViewProfile={(ip) => setProfileModalIp(ip)}
              />
            </div>

            {/* Lower Telemetry Section: Live Stream vs Blocked Requests Tab Switcher */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setSquidLogTab('live')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    squidLogTab === 'live'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Live HTTP/S Proxy Stream
                </button>

                <button
                  type="button"
                  onClick={() => setSquidLogTab('blocked')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    squidLogTab === 'blocked'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
                  Blocked Requests Audit ({blockedData.total.toLocaleString()})
                </button>
              </div>

              {squidLogTab === 'live' ? (
                <LiveRequestsTable
                  records={liveReqData.records}
                  total={liveReqData.total}
                  page={liveReqPage}
                  totalPages={liveReqData.totalPages}
                  isLoading={loadingLiveReq}
                  onPageChange={(p) => fetchLiveRequests(p)}
                  onSelectIp={handleSelectClientIp}
                  onViewProfile={(ip) => setProfileModalIp(ip)}
                />
              ) : (
                <BlockedRequestsList
                  records={blockedData.records}
                  total={blockedData.total}
                  page={blockedPage}
                  totalPages={blockedData.totalPages}
                  onPageChange={(p) => fetchBlocked(p)}
                  onEditAlias={handleOpenIpAliasModal}
                  onViewProfile={(ip) => setProfileModalIp(ip)}
                  isLoading={loadingBlocked}
                />
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW MODE 2: PFSENSE SOFTFLOWD (L3/L4 FOCUSED VIEW)
           ======================================================== */}
        {activeView === 'softflowd' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* NetFlow Filter Bar with 30m preset & Real-Time Toggle */}
            <SoftflowdFilters
              startDate={softflowdFilters.startDate}
              endDate={softflowdFilters.endDate}
              srcIp={softflowdFilters.srcIp}
              dstIp={softflowdFilters.dstIp}
              protocol={softflowdFilters.protocol}
              serviceName={softflowdFilters.serviceName}
              timeWindow={softflowdFilters.timeWindow}
              hideFirewallTraffic={softflowdFilters.hideFirewallTraffic}
              hideProxyHop={softflowdFilters.hideProxyHop}
              trafficType={softflowdFilters.trafficType}
              availableProtocols={netflowStats.filterOptions.protocols}
              availableServices={netflowStats.filterOptions.services}
              availableClientIps={netflowStats.filterOptions.availableClientIps}
              minDate={netflowStats.filterOptions.minDate}
              maxDate={netflowStats.filterOptions.maxDate}
              onFilterChange={handleSoftflowdFilterChange}
              onRefresh={handleRefresh}
              isRefreshing={refreshing}
              isRealTime={isRealTime}
              onToggleRealTime={() => setIsRealTime((prev) => !prev)}
            />

            {/* NetFlow KPI Metrics */}
            <SoftflowdMetrics metrics={netflowStats.overview} isLoading={loadingNetflow} />

            {/* Throughput Chart */}
            <ThroughputChart data={netflowStats.throughput} />

            {/* Top Talkers & Top Endpoints */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopTalkersTable
                talkers={netflowStats.topTalkers}
                onSelectIp={(ip) => handleSoftflowdFilterChange({ ...softflowdFilters, srcIp: ip })}
                onEditAlias={handleOpenIpAliasModal}
                onViewProfile={(ip) => setProfileModalIp(ip)}
              />
              <TopDestinationsTable
                destinations={netflowStats.topDestinations}
                internalDestinations={netflowStats.internalTraffic}
                onSelectDstIp={(ip: string) => handleSoftflowdFilterChange({ ...softflowdFilters, dstIp: ip })}
              />
            </div>

            {/* Top Network Services Breakdown */}
            <TopServicesTable
              services={netflowStats.topServices}
              onViewPort={(port, protocol) => setSelectedPort({ port, protocol })}
            />

            {/* Live Flow Telemetry Stream */}
            <LiveFlowsTable
              records={flowData.records}
              total={flowData.total}
              page={flowPage}
              totalPages={flowData.totalPages}
              isLoading={loadingFlows}
              onPageChange={(p) => fetchFlows(p)}
              onEditAlias={handleOpenIpAliasModal}
              onViewProfile={(ip: string) => setProfileModalIp(ip)}
            />
          </div>
        )}

        {/* ========================================================
            VIEW MODE 3: MULTITASK SPLIT VIEW (DUAL NOC WORKSPACE)
           ======================================================== */}
        {activeView === 'split' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Unified Control Bar for Multitasking */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Columns2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Multitasking Split Workspace
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live Telemetry Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Dual NOC monitoring: Squid HTTP/S Proxy (Left) alongside pfSense L3/L4 NetFlow (Right)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRealTime((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isRealTime
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${isRealTime ? 'text-rose-400' : 'text-slate-400'}`} />
                  {isRealTime ? 'REAL TIME (3s)' : 'Real Time: Off'}
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh All'}
                </button>
              </div>
            </div>

            {/* Dual Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Left Column: Squid Proxy */}
              <div className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <Network className="w-4 h-4 text-blue-400" />
                    Squid Web Proxy Telemetry
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {squidStats.overview.totalRequests.toLocaleString()} requests
                  </span>
                </div>

                <OverviewMetrics metrics={squidStats.overview} isLoading={loadingSquid} />

                <TopClientsTable
                  clients={squidStats.topClients}
                  onSelectIp={handleSelectClientIp}
                  onEditAlias={handleOpenIpAliasModal}
                  onViewProfile={(ip) => setProfileModalIp(ip)}
                  correlatedIp={correlatedIp}
                  onHoverIp={setCorrelatedIp}
                />

                <LiveRequestsTable
                  records={liveReqData.records}
                  total={liveReqData.total}
                  page={liveReqPage}
                  totalPages={liveReqData.totalPages}
                  isLoading={loadingLiveReq}
                  onPageChange={(p) => fetchLiveRequests(p)}
                  onSelectIp={handleSelectClientIp}
                  onViewProfile={(ip) => setProfileModalIp(ip)}
                />
              </div>

              {/* Right Column: pfSense softflowd */}
              <div className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    pfSense softflowd L3/L4 Telemetry
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {netflowStats.overview.totalFlows.toLocaleString()} flows
                  </span>
                </div>

                <SoftflowdMetrics metrics={netflowStats.overview} isLoading={loadingNetflow} />

                <TopTalkersTable
                  talkers={netflowStats.topTalkers}
                  onSelectIp={(ip) => handleSoftflowdFilterChange({ ...softflowdFilters, srcIp: ip })}
                  onEditAlias={handleOpenIpAliasModal}
                  onViewProfile={(ip) => setProfileModalIp(ip)}
                  correlatedIp={correlatedIp}
                  onHoverIp={setCorrelatedIp}
                />

                <LiveFlowsTable
                  records={flowData.records}
                  total={flowData.total}
                  page={flowPage}
                  totalPages={flowData.totalPages}
                  isLoading={loadingFlows}
                  onPageChange={(p) => fetchFlows(p)}
                  onEditAlias={handleOpenIpAliasModal}
                  onViewProfile={(ip: string) => setProfileModalIp(ip)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Squid &amp; pfSense Flow Analyzer &bull; nipponbpo.local Infrastructure &bull; SQLite WAL Telemetry Storage
      </footer>

      {/* Modals & Multitasking Dossier Drawer */}
      <IpProfileModal
        ip={profileModalIp}
        isOpen={!!profileModalIp}
        onClose={() => setProfileModalIp(null)}
        onFilterByIp={handleSelectClientIp}
        onUpdatedMapping={handleRefresh}
      />

      <IpMappingModal
        isOpen={isIpModalOpen}
        initialIp={targetIpForModal}
        onClose={() => {
          setIsIpModalOpen(false);
          setTargetIpForModal(undefined);
        }}
        onMappingsChanged={handleRefresh}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestored={handleRefresh}
      />

      <SquidConfigModal
        isOpen={isSquidConfigOpen}
        onClose={() => setIsSquidConfigOpen(false)}
      />

      <PfSenseConfigModal
        isOpen={isPfSenseConfigOpen}
        onClose={() => setIsPfSenseConfigOpen(false)}
      />

      <DomainDetailModal
        domain={selectedDomain}
        isOpen={!!selectedDomain}
        onClose={() => setSelectedDomain(null)}
        onFilterByDomain={(domain) => handleSquidFilterChange({ ...squidFilters, clientIp: undefined })}
        onViewIpProfile={(ip) => setProfileModalIp(ip)}
      />

      <PortDetailModal
        port={selectedPort?.port ?? null}
        protocol={selectedPort?.protocol}
        isOpen={!!selectedPort}
        onClose={() => setSelectedPort(null)}
        onViewIpProfile={(ip) => setProfileModalIp(ip)}
      />

      <BlockDomainModal
        domain={blockModalDomain}
        isOpen={!!blockModalDomain}
        onClose={() => setBlockModalDomain(null)}
        onSuccess={handleRefresh}
      />

      <ScheduledReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
