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
    topProtocol: string;
  };
  isLoading?: boolean;
}

export function SoftflowdMetrics({ metrics, isLoading }: SoftflowdMetricsProps) {
  const cards = [
    {
      title: 'Total Bandwidth',
      value: formatBytes(metrics.totalBytes),
      icon: HardDrive,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      subtitle: 'Combined ingress & egress',
    },
    {
      title: 'Download (Inbound)',
      value: formatBytes(metrics.downloadBytes),
      icon: ArrowDownCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      subtitle: 'Inbound traffic to LAN',
    },
    {
      title: 'Upload (Outbound)',
      value: formatBytes(metrics.uploadBytes),
      icon: ArrowUpCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      subtitle: 'Outbound traffic to WAN',
    },
    {
      title: 'Total Flows',
      value: formatNumber(metrics.totalFlows),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      subtitle: 'L3/L4 tracked sessions',
    },
    {
      title: 'Total Packets',
      value: formatNumber(metrics.totalPackets),
      icon: Layers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      subtitle: 'Inspected IP frames',
    },
    {
      title: 'Active Talkers',
      value: formatNumber(metrics.uniqueSrcIps),
      icon: Server,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      subtitle: `${metrics.uniqueDstIps} remote endpoints`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`rounded-xl border p-4 bg-slate-900/80 backdrop-blur-sm ${card.borderColor} shadow-sm transition-all hover:bg-slate-800/80`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-slate-100">
                {isLoading ? (
                  <span className="inline-block w-16 h-7 bg-slate-800 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
