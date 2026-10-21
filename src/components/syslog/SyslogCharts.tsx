'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity, Layers } from 'lucide-react';
import type { SyslogTimelineBucket, SyslogAppStat } from '@/lib/db/syslog-queries';

interface SyslogChartsProps {
  timeline: SyslogTimelineBucket[];
  topApps: SyslogAppStat[];
  onSelectApp?: (app: string) => void;
  selectedApp?: string;
}

export function SyslogCharts({ timeline, topApps, onSelectApp, selectedApp }: SyslogChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Severity Timeline Histogram (2 cols) */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Event Severity Over Time
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Hourly activity distribution</span>
        </div>

        <div className="h-56 w-full pt-1">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorWarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="errors"
                  name="Errors (0-3)"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorErrors)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="warnings"
                  name="Warnings (4)"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorWarnings)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="info"
                  name="Info / Notices (5-6)"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#colorInfo)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No timeline data available for the selected filters
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Applications Distribution (1 col) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Top Services & Daemons
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">By volume</span>
        </div>

        <div className="h-56 w-full pt-1 flex flex-col justify-center">
          {topApps.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-52 pr-1">
              {topApps.map((app) => {
                const isSelected = selectedApp?.toLowerCase() === app.app_name.toLowerCase();
                const total = topApps.reduce((acc, a) => acc + a.count, 0) || 1;
                const percent = Math.round((app.count / total) * 100);

                return (
                  <div
                    key={app.app_name}
                    onClick={() => onSelectApp && onSelectApp(isSelected ? '' : app.app_name)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold uppercase text-indigo-300 truncate">
                        {app.app_name}
                      </span>
                      {app.errorCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {app.errorCount} err
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs text-slate-400">{app.count.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No service logs recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
