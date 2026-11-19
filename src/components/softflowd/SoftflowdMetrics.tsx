'use client';

import React from 'react';
import { Activity, HardDrive, Layers, Server, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface SoftflowdMetricsProps {
  metrics: {
    totalFlows: number;
    totalBytes: number;
    downloadBytes: number;
    uploadBytes: number;
    totalPackets: number;
    uniqueSrcIps: number;
    uniqueDstIps: number;
    internalTalkers?: number;
    remoteEndpoints?: number;
    topProtocol: string;
  };
  isLoading?: boolean;
}

export function SoftflowdMetrics({ metrics, isLoading }: SoftflowdMetricsProps) {
  const localTalkers = metrics.internalTalkers ?? metrics.uniqueSrcIps;
  const remoteEndpoints = metrics.remoteEndpoints ?? metrics.uniqueDstIps;

  const cards = [
    {
      title: 'Total Bandwidth',
      value: formatBytes(metrics.totalBytes),
      icon: HardDrive,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      accentGlow: 'hover:shadow-blue-500/10',
      subtitle: 'Ingress & egress volume',
      tooltip: 'Total network throughput volume across all interfaces (inbound and outbound combined)',
    },
    {
      title: 'Download (Inbound)',
      value: formatBytes(metrics.downloadBytes),
      icon: ArrowDownCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      accentGlow: 'hover:shadow-emerald-500/10',
      subtitle: 'Inbound traffic to LAN',
      tooltip: 'Network data transferred from external servers or remote endpoints to local LAN workstations',
    },
    {
      title: 'Upload (Outbound)',
      value: formatBytes(metrics.uploadBytes),
      icon: ArrowUpCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      accentGlow: 'hover:shadow-purple-500/10',
      subtitle: 'Outbound traffic to WAN',
      tooltip: 'Network data uploaded from local LAN clients to external destinations across the firewall',
    },
    {
      title: 'Total Flows',
      value: formatNumber(metrics.totalFlows),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      accentGlow: 'hover:shadow-indigo-500/10',
      subtitle: 'L3/L4 tracked sessions',
      tooltip: 'Total unidirectional IP conversation flows recorded by pfSense softflowd collector',
    },
    {
      title: 'Total Packets',
      value: formatNumber(metrics.totalPackets),
      icon: Layers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      accentGlow: 'hover:shadow-amber-500/10',
      subtitle: 'Inspected IP frames',
      tooltip: 'Total raw network packets captured and accounted for in NetFlow datagrams',
    },
    {
      title: 'Active Talkers',
      value: formatNumber(localTalkers),
      icon: Server,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      accentGlow: 'hover:shadow-rose-500/10',
      subtitle: `${remoteEndpoints} remote endpoints`,
      tooltip: 'Internal LAN hosts actively communicating over the pfSense network during this timeframe',
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
