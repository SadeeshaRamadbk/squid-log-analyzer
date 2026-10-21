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
      subtitle: 'Combined HTTP/S data transfer',
      tooltip: 'Total bytes transferred through the Squid caching proxy for both allowed and blocked requests',
    },
    {
      title: 'Download (Inbound)',
      value: formatBytes(downloadBytes),
      icon: ArrowDownCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      subtitle: 'Payload delivered to LAN clients',
      tooltip: 'Estimated web content downloaded by workstations from external web servers (GET, HEAD, and 85% of CONNECT tunnels)',
    },
    {
      title: 'Upload (Outbound)',
      value: formatBytes(uploadBytes),
      icon: ArrowUpCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      subtitle: 'POST, headers & tunnels to WAN',
      tooltip: 'Data sent from LAN workstations to web servers (POST/PUT payloads and SSL tunnel initiation handshakes)',
    },
    {
      title: 'Total Requests',
      value: formatNumber(metrics.totalRequests),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      subtitle: 'HTTP methods & CONNECT tunnels',
      tooltip: 'Total number of HTTP/HTTPS proxy transactions processed by Squid in the active time window',
    },
    {
      title: 'Blocked Requests',
      value: formatNumber(metrics.blockedRequests),
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      subtitle: `${blockedRate}% of total traffic`,
      tooltip: 'Requests denied by Squid ACL access control lists (HTTP 403 Forbidden or TCP_DENIED)',
    },
    {
      title: 'Unique Domains',
      value: formatNumber(metrics.uniqueDomains),
      icon: Globe,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      subtitle: `${metrics.uniqueClients} active client IPs`,
      tooltip: 'Distinct Fully Qualified Domain Names (FQDNs) contacted, accessed by distinct internal workstation IPs',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`rounded-xl border p-4 bg-slate-900/80 backdrop-blur-sm ${card.borderColor} shadow-sm transition-all hover:bg-slate-800/80 cursor-help`}
            title={card.tooltip}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-[28px] xl:text-[30px] font-extrabold tracking-tight text-slate-100 tabular-nums leading-none">
                {isLoading ? (
                  <span className="inline-block w-20 h-7 bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 font-medium">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
