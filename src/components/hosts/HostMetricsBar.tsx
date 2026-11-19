'use client';

import React from 'react';
import {
  Laptop,
  ArrowDownCircle,
  ArrowUpCircle,
  Globe,
  ShieldAlert,
  Activity,
  Layers,
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface HostMetricsBarProps {
  kpis: {
    totalHosts: number;
    mappedHosts: number;
    unmappedHosts: number;
    totalBandwidth: number;
    totalDownloadBytes: number;
    totalUploadBytes: number;
    totalSquidRequests: number;
    totalSquidBlocked: number;
    totalSyslogBlocks: number;
  };
}

export function HostMetricsBar({ kpis }: HostMetricsBarProps) {
  const downloadPct = kpis.totalBandwidth > 0
    ? Math.round((kpis.totalDownloadBytes / (kpis.totalDownloadBytes + kpis.totalUploadBytes || 1)) * 100)
    : 50;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {/* 1. Total Hosts */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Monitored Hosts</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Laptop className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(kpis.totalHosts)}
          </span>
          <span className="text-xs text-slate-400">active devices</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-emerald-400 font-medium">{kpis.mappedHosts} assigned</span>
          <span>•</span>
          <span className="text-amber-400/90">{kpis.unmappedHosts} unassigned</span>
        </div>
      </div>

      {/* 2. Total Bandwidth Consumed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Bandwidth</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatBytes(kpis.totalBandwidth)}
          </span>
          <span className="text-xs text-slate-400">transferred</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[11px]">
          <span className="text-emerald-400 flex items-center gap-1">
            <ArrowDownCircle className="w-3 h-3" />
            {formatBytes(kpis.totalDownloadBytes)} ({downloadPct}%)
          </span>
          <span className="text-blue-400 flex items-center gap-1">
            <ArrowUpCircle className="w-3 h-3" />
            {formatBytes(kpis.totalUploadBytes)} ({100 - downloadPct}%)
          </span>
        </div>
      </div>

      {/* 3. Squid Web Proxy Activity */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Squid Web Requests</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(kpis.totalSquidRequests)}
          </span>
          <span className="text-xs text-slate-400">HTTP/S hits</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-indigo-400 font-medium">L7 Proxy Traffic</span>
          <span>•</span>
          <span className="text-slate-300">Monitored</span>
        </div>
      </div>

      {/* 4. Blocked Web Access */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Web Policy Blocks</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-rose-400 tracking-tight">
            {formatNumber(kpis.totalSquidBlocked)}
          </span>
          <span className="text-xs text-slate-400">denied requests</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-rose-400/90 font-medium">
          <span>Squid 403 ACL / Blacklist</span>
        </div>
      </div>

      {/* 5. pfSense Firewall Drops */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Firewall Security Drops</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-purple-400 tracking-tight">
            {formatNumber(kpis.totalSyslogBlocks)}
          </span>
          <span className="text-xs text-slate-400">dropped packets</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-purple-400/90 font-medium">
          <span>pfSense filterlog events</span>
        </div>
      </div>
    </div>
  );
}
