'use client';

import React from 'react';
import { Terminal, AlertOctagon, AlertTriangle, Layers, ShieldAlert } from 'lucide-react';
import type { SyslogOverviewStats } from '@/lib/db/syslog-queries';

interface SyslogMetricsProps {
  stats: SyslogOverviewStats | null;
  isLoading?: boolean;
}

export function SyslogMetrics({ stats, isLoading }: SyslogMetricsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const { totalEvents, criticalErrors, warnings, notices, info, firewallBlocks, topApps } = stats;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 1. Total Syslog Events */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between" title="Total raw syslog events ingested across all services">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Syslog Events
          </span>
          <div className="text-[28px] font-extrabold font-mono text-white mt-1.5 leading-none tabular-nums">
            {totalEvents.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {topApps.length} active service daemons
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Terminal className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Firewall Blocks (Security Relevant) */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/40 bg-gradient-to-br from-rose-950/20 to-slate-900 flex items-center justify-between relative overflow-hidden" title="pfSense filterlog block and reject actions">
        {firewallBlocks > 0 && (
          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 m-2 animate-ping" />
        )}
        <div>
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1">
            Firewall Blocks
          </span>
          <div className="text-[28px] font-extrabold font-mono text-rose-400 mt-1.5 leading-none tabular-nums">
            {firewallBlocks.toLocaleString()}
          </div>
          <span className="text-xs text-rose-400/90 mt-1 block">
            {totalEvents > 0 ? ((firewallBlocks / totalEvents) * 100).toFixed(1) : 0}% security blocks
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Critical & Errors */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-red-500/30 flex items-center justify-between" title="Syslog severity 0-3 (Emergency, Alert, Critical, Error)">
        <div>
          <span className="text-xs font-semibold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
            Errors &amp; Critical
          </span>
          <div className="text-[28px] font-extrabold font-mono text-red-400 mt-1.5 leading-none tabular-nums">
            {criticalErrors.toLocaleString()}
          </div>
          <span className="text-xs text-red-400/90 mt-1 block">
            {totalEvents > 0 ? ((criticalErrors / totalEvents) * 100).toFixed(1) : 0}% of all events
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Warnings */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between" title="Syslog severity 4 (Warning conditions, including security blocks)">
        <div>
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            Warnings
          </span>
          <div className="text-[28px] font-extrabold font-mono text-amber-400 mt-1.5 leading-none tabular-nums">
            {warnings.toLocaleString()}
          </div>
          <span className="text-xs text-amber-400/90 mt-1 block">
            Security blocks &amp; warnings
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* 5. Notices & Informational */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between" title="Syslog severity 5-7 (Notices, Informational, Debug)">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Notices &amp; Info
          </span>
          <div className="text-[28px] font-extrabold font-mono text-cyan-300 mt-1.5 leading-none tabular-nums">
            {(notices + info).toLocaleString()}
          </div>
          <span className="text-xs text-cyan-400/90 mt-1 block">
            Operational activity &amp; leases
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Layers className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
