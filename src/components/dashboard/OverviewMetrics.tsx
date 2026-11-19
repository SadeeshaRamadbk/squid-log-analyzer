'use client';

import React from 'react';
import { Activity, ShieldAlert, Globe, HardDrive, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface OverviewMetricsProps {
  metrics: {
    totalRequests: number;
    totalBytes: number;
    downloadBytes?: number;
    uploadBytes?: number;
    blockedRequests: number;
    uniqueDomains: number;
    uniqueClients: number;
  };
  isLoading?: boolean;
}

export function OverviewMetrics({ metrics, isLoading }: OverviewMetricsProps) {
  const blockedRate =
    metrics.totalRequests > 0
      ? ((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(1)
      : '0.0';

  const downloadBytes = metrics.downloadBytes ?? Math.round(metrics.totalBytes * 0.85);
  const uploadBytes = metrics.uploadBytes ?? Math.max(0, metrics.totalBytes - downloadBytes);

  const cards = [
    {
      title: 'Total Bandwidth',
      value: formatBytes(metrics.totalBytes),
      icon: HardDrive,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      accentGlow: 'hover:shadow-blue-500/10',
      subtitle: 'Combined HTTP/S volume',
      tooltip: 'Total bytes transferred through the Squid caching proxy for both allowed and blocked requests',
    },
    {
      title: 'Download (Inbound)',
      value: formatBytes(downloadBytes),
      icon: ArrowDownCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      accentGlow: 'hover:shadow-emerald-500/10',
      subtitle: 'Delivered to LAN clients',
      tooltip: 'Estimated web content downloaded by workstations from external web servers',
    },
    {
      title: 'Upload (Outbound)',
      value: formatBytes(uploadBytes),
      icon: ArrowUpCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      accentGlow: 'hover:shadow-purple-500/10',
      subtitle: 'POST & tunnel egress',
      tooltip: 'Data sent from LAN workstations to web servers (POST payloads and SSL tunnel initiation handshakes)',
    },
    {
      title: 'Total Requests',
      value: formatNumber(metrics.totalRequests),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      accentGlow: 'hover:shadow-indigo-500/10',
      subtitle: 'Processed proxy sessions',
      tooltip: 'Total number of HTTP/HTTPS proxy transactions processed by Squid in the active time window',
    },
    {
      title: 'Blocked Requests',
      value: formatNumber(metrics.blockedRequests),
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      accentGlow: 'hover:shadow-rose-500/10',
      subtitle: `${blockedRate}% denial rate`,
      tooltip: 'Requests denied by Squid ACL access control lists (HTTP 403 Forbidden or TCP_DENIED)',
    },
    {
      title: 'Unique Domains',
      value: formatNumber(metrics.uniqueDomains),
      icon: Globe,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      accentGlow: 'hover:shadow-cyan-500/10',
      subtitle: `${metrics.uniqueClients} active workstation IPs`,
      tooltip: 'Distinct Fully Qualified Domain Names (FQDNs) contacted by internal workstations',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`rounded-xl border p-4 bg-slate-900/75 backdrop-blur-md ${card.borderColor} shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.accentGlow} cursor-help border-t-white/10 group relative overflow-hidden`}
            title={card.tooltip}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color} border border-white/5 transition-transform group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl xl:text-[26px] font-extrabold tracking-tight text-white tabular-nums leading-none font-mono">
                {isLoading ? (
                  <span className="inline-block w-20 h-7 bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 font-medium truncate">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
