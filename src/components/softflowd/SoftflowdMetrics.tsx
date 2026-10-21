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
      subtitle: 'Combined ingress & egress',
      tooltip: 'Total network throughput volume across all interfaces (inbound and outbound combined)',
    },
    {
      title: 'Download (Inbound)',
      value: formatBytes(metrics.downloadBytes),
      icon: ArrowDownCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
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
      subtitle: 'Inspected IP frames',
      tooltip: 'Total raw network packets captured and accounted for in NetFlow datagrams',
    },
    {
      title: 'Active Talkers',
      value: formatNumber(localTalkers),
      icon: Server,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      subtitle: `${formatNumber(remoteEndpoints)} remote endpoints`,
      tooltip: 'Distinct internal LAN devices actively transmitting or receiving data, communicating with external endpoints',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
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
