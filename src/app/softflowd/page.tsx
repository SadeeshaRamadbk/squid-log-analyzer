'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SoftflowdMetrics } from '@/components/softflowd/SoftflowdMetrics';
import { SoftflowdFilters } from '@/components/softflowd/SoftflowdFilters';
import { ThroughputChart } from '@/components/softflowd/ThroughputChart';
import { TopTalkersTable } from '@/components/softflowd/TopTalkersTable';
import { TopDestinationsTable } from '@/components/softflowd/TopDestinationsTable';
import { TopServicesTable } from '@/components/softflowd/TopServicesTable';
import { LiveFlowsTable, FlowRecord } from '@/components/softflowd/LiveFlowsTable';
import { IpMappingModal } from '@/components/dashboard/IpMappingModal';
import { BackupRestoreModal } from '@/components/dashboard/BackupRestoreModal';
import { PfSenseConfigModal } from '@/components/softflowd/PfSenseConfigModal';
import { SquidConfigModal } from '@/components/dashboard/SquidConfigModal';
import { RetentionBanner } from '@/components/dashboard/RetentionBanner';
import { IpProfileModal } from '@/components/profile/IpProfileModal';

export default function SoftflowdPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    srcIp?: string;
    dstIp?: string;
    protocol?: string;
    serviceName?: string;
    timeWindow?: '30m' | '1h';
  }>({
    // Default filter
  });

  const [isRealTime, setIsRealTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSquidConfigOpen, setIsSquidConfigOpen] = useState(false);
  const [targetIpForModal, setTargetIpForModal] = useState<string | undefined>(undefined);
  const [profileModalIp, setProfileModalIp] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<{
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

  // Flows pagination state
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

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.srcIp) params.set('srcIp', filters.srcIp);
      if (filters.dstIp) params.set('dstIp', filters.dstIp);
      if (filters.protocol) params.set('protocol', filters.protocol);
      if (filters.serviceName) params.set('serviceName', filters.serviceName);
      if (filters.timeWindow) params.set('timeWindow', filters.timeWindow);

      const res = await fetch(`/api/netflow/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      console.error('Failed to load NetFlow stats:', err);
    }
  }, [filters]);

  // Fetch Flows
  const fetchFlows = useCallback(async (page = 1) => {
    setLoadingFlows(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.srcIp) params.set('srcIp', filters.srcIp);
      if (filters.dstIp) params.set('dstIp', filters.dstIp);
      if (filters.protocol) params.set('protocol', filters.protocol);
      if (filters.serviceName) params.set('serviceName', filters.serviceName);
      if (filters.timeWindow) params.set('timeWindow', filters.timeWindow);
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
      console.error('Failed to load NetFlow flows:', err);
    } finally {
      setLoadingFlows(false);
    }
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchFlows(1)]);
      if (isMounted) setLoading(false);
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [fetchStats, fetchFlows]);

  // Real-Time 3s Polling
  useEffect(() => {
    if (!isRealTime) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchFlows(flowPage);
    }, 3000);
    return () => clearInterval(interval);
  }, [isRealTime, fetchStats, fetchFlows, flowPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchFlows(flowPage)]);
    setRefreshing(false);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setFlowPage(1);
  };

  const handleOpenIpAlias = (ip: string) => {
    setTargetIpForModal(ip);
    setIsIpModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Shared Header Navigation */}
      <AppHeader
        activeView="softflowd"
        onViewChange={(v) => router.push(v === 'softflowd' ? '/softflowd' : v === 'split' ? '/?view=split' : '/')}
        onOpenIpModal={() => {
          setTargetIpForModal(undefined);
          setIsIpModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onOpenSquidConfig={() => setIsSquidConfigOpen(true)}
        onSelectProfile={(ip) => setProfileModalIp(ip)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Retention Banner */}
        <RetentionBanner onRetentionTriggered={handleRefresh} />

        {/* Softflowd Filters */}
        <SoftflowdFilters
          startDate={filters.startDate}
          endDate={filters.endDate}
          srcIp={filters.srcIp}
          dstIp={filters.dstIp}
          protocol={filters.protocol}
          serviceName={filters.serviceName}
          timeWindow={filters.timeWindow}
          availableClientIps={stats.filterOptions.availableClientIps}
          availableProtocols={stats.filterOptions.protocols}
          availableServices={stats.filterOptions.services}
          minDate={stats.filterOptions.minDate}
          maxDate={stats.filterOptions.maxDate}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
          isRealTime={isRealTime}
          onToggleRealTime={() => setIsRealTime((prev) => !prev)}
        />

        {/* KPI Metrics Cards */}
        <SoftflowdMetrics metrics={stats.overview} isLoading={loading} />

        {/* Throughput & Flows Chart */}
        <ThroughputChart data={stats.throughput} />

        {/* Top Talkers & Top Destinations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopTalkersTable
            talkers={stats.topTalkers}
            onSelectIp={(ip) => handleFilterChange({ ...filters, srcIp: ip })}
            onEditAlias={handleOpenIpAlias}
            onViewProfile={(ip) => setProfileModalIp(ip)}
          />
          <TopDestinationsTable
            destinations={stats.topDestinations}
            onSelectDstIp={(ip) => handleFilterChange({ ...filters, dstIp: ip })}
          />
        </div>

        {/* Top Services & Ports */}
        <TopServicesTable
          services={stats.topServices}
          onSelectService={(s) => handleFilterChange({ ...filters, serviceName: s })}
        />

        {/* Live Flow Audit Table */}
        <LiveFlowsTable
          records={flowData.records}
          total={flowData.total}
          page={flowPage}
          totalPages={flowData.totalPages}
          onPageChange={(p) => fetchFlows(p)}
          onEditAlias={handleOpenIpAlias}
          onViewProfile={(ip) => setProfileModalIp(ip)}
          isLoading={loadingFlows}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        pfSense softflowd 1.2.6_4 Flow Analyzer &bull; nipponbpo.local Gateway Infrastructure &bull; SQLite WAL Storage
      </footer>

      {/* Modals */}
      <IpProfileModal
        ip={profileModalIp}
        isOpen={!!profileModalIp}
        onClose={() => setProfileModalIp(null)}
        onFilterByIp={(ip) => handleFilterChange({ ...filters, srcIp: ip })}
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

      <PfSenseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      <SquidConfigModal
        isOpen={isSquidConfigOpen}
        onClose={() => setIsSquidConfigOpen(false)}
      />
    </div>
  );
}
