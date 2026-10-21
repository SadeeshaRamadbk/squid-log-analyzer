'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Radio, CheckCircle, Terminal } from 'lucide-react';

interface HealthData {
  netflow: {
    status: 'green' | 'amber' | 'red';
    lastFlowTime: number;
    formattedLastFlow: string;
    flowsPerSecond: number;
    totalFlows: number;
    port: number;
  };
  squid: {
    status: 'green' | 'amber' | 'red';
    lastSquidTime: number;
    formattedLastSquid: string;
    totalSquidLogs: number;
    port: number;
  };
  syslog?: {
    status: 'green' | 'amber' | 'red';
    lastSyslogTime: number;
    formattedLastSyslog: string;
    eventsPerSecond: number;
    totalSyslogEvents: number;
    port: number;
  };
  systemTime: string;
  timezone: string;
}

interface CollectorHealthBadgeProps {
  className?: string;
}

export function CollectorHealthBadge({ className }: CollectorHealthBadgeProps = {}) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/collector/health');
      const json = await res.json();
      if (json.success) {
        setHealth(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch collector health', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
        Checking...
      </div>
    );
  }

  const statuses = [health.netflow.status, health.squid.status];
  if (health.syslog) statuses.push(health.syslog.status);

  const allGreen = statuses.every((s) => s === 'green');
  const anyGreenOrAmber = statuses.some((s) => s === 'green' || s === 'amber');

  const overallStatus = allGreen ? 'green' : anyGreenOrAmber ? 'amber' : 'red';

  const dotColor =
    overallStatus === 'green'
      ? 'bg-emerald-400'
      : overallStatus === 'amber'
      ? 'bg-amber-400'
      : 'bg-rose-400';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Collector health status"
        className={className || "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"}
        title="View NetFlow & Squid Collector Health Status"
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
        <span className="font-mono text-[11px] font-medium text-slate-300">
          {health.netflow.flowsPerSecond > 0 ? `${health.netflow.flowsPerSecond} f/s` : 'NetFlow Active'}
        </span>
      </button>

      {/* Popover Details Drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-400" />
                Collector Health Diagnostics
              </span>
              <button
                type="button"
                onClick={fetchHealth}
                disabled={loading}
                aria-label="Refresh health diagnostics"
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>

            {/* NetFlow v5 Status */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> pfSense softflowd
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    health.netflow.status === 'green'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : health.netflow.status === 'amber'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {health.netflow.status === 'green' ? 'Online' : health.netflow.status === 'amber' ? 'Idle' : 'No Traffic'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span>Port:</span>
                  <span className="text-slate-200">UDP {health.netflow.port}</span>
                </div>
                <div className="flex justify-between">
                  <span>Throughput:</span>
                  <span className="text-cyan-300 font-semibold">{health.netflow.flowsPerSecond} flows/sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Flow:</span>
                  <span className="text-slate-300">{health.netflow.formattedLastFlow}</span>
                </div>
              </div>
            </div>

            {/* Squid Proxy Status */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> Squid Web Proxy
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    health.squid.status === 'green'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : health.squid.status === 'amber'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {health.squid.status === 'green' ? 'Streaming' : health.squid.status === 'amber' ? 'Idle' : 'No Logs'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span>Proxy Port:</span>
                  <span className="text-slate-200">TCP {health.squid.port}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Ingested:</span>
                  <span className="text-slate-300">{health.squid.totalSquidLogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Log:</span>
                  <span className="text-slate-300">{health.squid.formattedLastSquid}</span>
                </div>
              </div>
            </div>

            {/* pfSense Syslog Status */}
            {health.syslog && (
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" /> pfSense Syslog UDP
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      health.syslog.status === 'green'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : health.syslog.status === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {health.syslog.status === 'green' ? 'Receiving' : health.syslog.status === 'amber' ? 'Idle' : 'No Traffic'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <div className="flex justify-between">
                    <span>Syslog Port:</span>
                    <span className="text-slate-200">UDP {health.syslog.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event Rate:</span>
                    <span className="text-purple-300 font-semibold">{health.syslog.eventsPerSecond} events/sec</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Ingested:</span>
                    <span className="text-slate-300">{health.syslog.totalSyslogEvents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Event:</span>
                    <span className="text-slate-300">{health.syslog.formattedLastSyslog}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 text-center font-mono pt-1">
              Timezone: {health.timezone} &bull; {health.systemTime}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
