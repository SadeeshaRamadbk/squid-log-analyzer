'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Filter,
  CheckCircle,
  Network,
  Server,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import type { FirewallBlocksOverview } from '@/lib/db/syslog-queries';

interface FirewallBlocksViewProps {
  data: FirewallBlocksOverview | null;
  isLoading: boolean;
  suppressNoise: boolean;
  onToggleSuppressNoise: () => void;
}

export function FirewallBlocksView({
  data,
  isLoading,
  suppressNoise,
  onToggleSuppressNoise,
}: FirewallBlocksViewProps) {
  if (isLoading && !data) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Analyzing firewall filterlog telemetry...</p>
      </div>
    );
  }

  if (!data || data.totalBlocks === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
        <CheckCircle className="w-10 h-10 mx-auto text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-200">No Firewall Block Events Found</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No packets were rejected or dropped by pfSense filterlog within the selected timeframe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Noise Suppression Header Card */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>pfSense Firewall Blocks Intelligence & Threat Surface</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured analysis of blocked connection attempts, port scans, and WAN/LAN drop rules extracted from filterlog CSV telemetry.
          </p>
        </div>

        <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors shrink-0">
          <input
            type="checkbox"
            checked={suppressNoise}
            onChange={onToggleSuppressNoise}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-200">Noise Suppression Active</span>
            <span className="text-slate-400 block text-[11px]">
              Filters SSDP 1900, late RST/ACKs, and subnet broadcasts
            </span>
          </div>
        </label>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Blocks
          </span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {formatNumber(data.totalBlocks)}
          </div>
          <p className="text-[11px] text-slate-500">Raw filterlog drop & reject actions</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Actionable Threats
          </span>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {formatNumber(data.actionableBlocks)}
          </div>
          <p className="text-[11px] text-slate-500">Excludes multicast and background noise</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Suppressed Noise
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatNumber(data.suppressedNoiseCount)}
          </div>
          <p className="text-[11px] text-slate-500">SSDP 239.255.255.250 & late RST drops</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Unique Sources Blocked
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {formatNumber(data.uniqueSources)}
          </div>
          <p className="text-[11px] text-slate-500">Distinct external and internal origin IPs</p>
        </div>
      </div>

      {/* 2-Column Grid: Top Blocked Sources & Top Blocked Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Blocked Sources */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>Top Blocked Sources (Origin IPs)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Top 10</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {data.topSources.length === 0 ? (
              <p className="py-4 text-center text-slate-500">No sources recorded.</p>
            ) : (
              data.topSources.map((s, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <Link
                      href={`/user/${encodeURIComponent(s.key)}`}
                      className="font-mono font-semibold text-cyan-300 hover:underline flex items-center gap-1.5"
                      title="Open unified device/user timeline"
                    >
                      <span>{s.key}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-500 opacity-70" />
                    </Link>
                    {s.sublabel && (
                      <span className="text-[11px] text-slate-400 font-sans">{s.sublabel}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-400">{formatNumber(s.count)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">blocks</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Blocked Destinations */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>Top Blocked Target Destinations</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Top 10</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {data.topDestinations.length === 0 ? (
              <p className="py-4 text-center text-slate-500">No destinations recorded.</p>
            ) : (
              data.topDestinations.map((d, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-slate-200">{d.key}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-400">{formatNumber(d.count)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">blocks</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Top Blocked Ports & Interface Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Blocked Ports */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>Top Blocked Target Ports & Services</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Port (Protocol)</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {data.topPorts.length === 0 ? (
              <p className="py-4 text-center text-slate-500">No ports recorded.</p>
            ) : (
              data.topPorts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-purple-950/60 text-purple-300 border border-purple-800/60 font-semibold">
                      {p.port} / {p.protocol}
                    </span>
                    <span className="font-medium text-slate-300">{p.service}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-400">{formatNumber(p.count)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">hits</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Interface & Rule Trackers */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>pfSense Interface Drops</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {data.interfaces.map((iface, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <span className="font-mono font-medium text-slate-300 uppercase">
                    {iface.interface} ({iface.direction})
                  </span>
                  <span className="font-mono font-bold text-rose-400">{formatNumber(iface.count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>pfSense Rule Tracker Hits</span>
              </h3>
            </div>
            <div className="space-y-1.5 text-xs">
              {data.trackers.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <span className="font-mono text-slate-400">Rule Tracker #{t.tracker}</span>
                  <span className="font-mono font-bold text-slate-200">{formatNumber(t.count)} hits</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
