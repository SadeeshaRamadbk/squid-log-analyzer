'use client';

import React from 'react';
import { Terminal, AlertOctagon, AlertTriangle, Layers, ShieldAlert, Radio } from 'lucide-react';
import type { SyslogOverviewStats } from '@/lib/db/syslog-queries';

interface SyslogMetricsProps {
  stats: SyslogOverviewStats | null;
  isLoading?: boolean;
}

export function SyslogMetrics({ stats, isLoading }: SyslogMetricsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-slate-900/50 border border-slate-800/80 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const { totalEvents, criticalErrors, warnings, notices, info, firewallBlocks, topApps } = stats;

  const cards = [
    {
      title: 'Total Syslog Events',
      value: totalEvents.toLocaleString(),
      subtitle: `${topApps.length} active service daemons`,
      icon: Terminal,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      accentGlow: 'hover:shadow-blue-500/10',
      tooltip: 'Total raw syslog events ingested across all services',
    },
    {
      title: 'Firewall Blocks',
      value: firewallBlocks.toLocaleString(),
      subtitle: `${totalEvents > 0 ? ((firewallBlocks / totalEvents) * 100).toFixed(1) : '0.0'}% security drop rate`,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/40',
      accentGlow: 'hover:shadow-rose-500/10',
      isPulsing: firewallBlocks > 0,
      tooltip: 'pfSense filterlog block and reject actions',
    },
    {
      title: 'Critical & Errors',
      value: criticalErrors.toLocaleString(),
      subtitle: `${totalEvents > 0 ? ((criticalErrors / totalEvents) * 100).toFixed(1) : '0.0'}% of all events`,
      icon: AlertOctagon,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      accentGlow: 'hover:shadow-red-500/10',
      tooltip: 'Syslog severity 0-3 (Emergency, Alert, Critical, Error)',
    },
    {
      title: 'Warnings',
      value: warnings.toLocaleString(),
      subtitle: 'Security warnings & state issues',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      accentGlow: 'hover:shadow-amber-500/10',
      tooltip: 'Syslog severity 4 (Warning conditions, including security drops)',
    },
    {
      title: 'Notices & Informational',
      value: (notices + info).toLocaleString(),
      subtitle: 'Operational logs & DHCP activity',
      icon: Layers,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      accentGlow: 'hover:shadow-cyan-500/10',
      tooltip: 'Syslog severity 5-7 (Notices, Informational, Debug)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`group relative rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/90 border-t-white/10 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg ${card.accentGlow}`}
            title={card.tooltip}
          >
            {card.isPulsing && (
              <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {card.title}
                </span>
                <div className="text-2xl font-black font-mono tracking-tight text-slate-100 tabular-nums">
                  {card.value}
                </div>
              </div>
              <div
                className={`p-2.5 rounded-lg ${card.bgColor} ${card.color} border ${card.borderColor} shadow-inner shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-400 transition-colors" />
              <span className="truncate">{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
