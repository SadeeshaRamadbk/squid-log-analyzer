'use client';

import React, { useState, useMemo } from 'react';
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
import { Activity, Layers, Table as TableIcon, LineChart as ChartIcon, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { formatCompactNumber } from '@/lib/formatters';
import type { SyslogTimelineBucket, SyslogAppStat } from '@/lib/db/syslog-queries';

interface SyslogChartsProps {
  timeline: SyslogTimelineBucket[];
  topApps: SyslogAppStat[];
  onSelectApp?: (app: string) => void;
  selectedApp?: string;
}

export function SyslogCharts({ timeline, topApps, onSelectApp, selectedApp }: SyslogChartsProps) {
  const [viewAsTable, setViewAsTable] = useState(false);

  const summary = useMemo(() => {
    const totalErrors = timeline.reduce((acc, t) => acc + (t.errors || 0), 0);
    const totalWarnings = timeline.reduce((acc, t) => acc + (t.warnings || 0), 0);
    const totalInfo = timeline.reduce((acc, t) => acc + (t.info || 0), 0);
    return { totalErrors, totalWarnings, totalInfo };
  }, [timeline]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Severity Timeline Histogram (2 cols) */}
      <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800/90 border-t-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        {/* Accessible screen reader summary */}
        <div className="sr-only" aria-live="polite">
          Syslog severity events: {summary.totalErrors} errors, {summary.totalWarnings} warnings, and {summary.totalInfo} info notices recorded across the timeline.
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Event Severity Over Time
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Hourly activity distribution</span>
            <button
              type="button"
              onClick={() => setViewAsTable((prev) => !prev)}
              aria-pressed={viewAsTable}
              aria-label={viewAsTable ? 'Switch to severity chart view' : 'Switch to severity table view'}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {viewAsTable ? (
                <>
                  <ChartIcon className="w-3 h-3 text-indigo-400" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3 h-3 text-indigo-400" />
                  <span>Table</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="h-56 w-full pt-1">
          {timeline.length > 0 ? (
            viewAsTable ? (
              <div className="h-full overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Syslog Event Severity Over Time Table</caption>
                  <thead className="bg-slate-950/80 sticky top-0 z-10 text-slate-300 font-semibold border-b border-slate-800">
                    <tr>
                      <th scope="col" className="py-1.5 px-2.5">Time Label</th>
                      <th scope="col" className="py-1.5 px-2.5 text-right text-rose-400">Errors (0-3)</th>
                      <th scope="col" className="py-1.5 px-2.5 text-right text-amber-400">Warnings (4)</th>
                      <th scope="col" className="py-1.5 px-2.5 text-right text-cyan-400">Info (5-6)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {timeline.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-1 px-2.5 whitespace-nowrap">{row.timeLabel}</td>
                        <td className="py-1 px-2.5 text-right text-rose-300 font-bold">{row.errors}</td>
                        <td className="py-1 px-2.5 text-right text-amber-300">{row.warnings}</td>
                        <td className="py-1 px-2.5 text-right text-cyan-300">{row.info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#475569' }} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    width={44}
                    domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 'auto')]}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(val) => formatCompactNumber(val)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
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
                    name="Warnings (4 - Dashed)"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorWarnings)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="info"
                    name="Info (5-6 - Dotted)"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorInfo)"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No timeline data available for the selected filters
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Applications Distribution (1 col) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/90 border-t-white/10 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Top Services &amp; Daemons
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">By volume</span>
        </div>

        <div className="h-56 w-full pt-1 flex flex-col justify-center">
          {topApps.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-52 pr-1">
              {topApps.map((app) => {
                const isSelected = selectedApp?.toLowerCase() === app.app_name.toLowerCase();
                const total = topApps.reduce((acc, a) => acc + a.count, 0) || 1;
                const percent = Math.round((app.count / total) * 100);

                return (
                  <button
                    key={app.app_name}
                    type="button"
                    onClick={() => onSelectApp && onSelectApp(isSelected ? '' : app.app_name)}
                    aria-pressed={isSelected}
                    className={`w-full p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-left ${
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
                      <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No service logs recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
