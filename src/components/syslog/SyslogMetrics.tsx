'use client';

import React from 'react';
import { Terminal, AlertOctagon, AlertTriangle, Layers, Info } from 'lucide-react';
import type { SyslogOverviewStats } from '@/lib/db/syslog-queries';

interface SyslogMetricsProps {
  stats: SyslogOverviewStats | null;
  isLoading?: boolean;
}

export function SyslogMetrics({ stats, isLoading }: SyslogMetricsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const { totalEvents, criticalErrors, warnings, notices, info, topApps } = stats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Syslog Events */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Syslog Events
          </span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {totalEvents.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            {topApps.length} active service daemons
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Terminal className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Critical & Errors */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 flex items-center justify-between relative overflow-hidden">
        {criticalErrors > 0 && (
          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 m-2 animate-ping" />
        )}
        <div>
          <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
            Errors & Critical
          </span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {criticalErrors.toLocaleString()}
          </div>
          <span className="text-[10px] text-rose-400/80">
            {totalEvents > 0 ? ((criticalErrors / totalEvents) * 100).toFixed(1) : 0}% of all events
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Warnings */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
            Warnings
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {warnings.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-400/80">
            Cache, gateway & DNS warnings
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Active Applications */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Notices & Informational
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
            {(notices + info).toLocaleString()}
          </div>
          <span className="text-[10px] text-cyan-400/80">
            Operational activity & leases
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Layers className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
