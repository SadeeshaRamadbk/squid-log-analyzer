'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart2, Table as TableIcon, LineChart as ChartIcon, ShieldAlert, ArrowDown, ArrowUp } from 'lucide-react';
import { formatDate, formatNumber, formatCompactNumber, formatBytes } from '@/lib/formatters';

interface RequestsChartProps {
  data: Array<{
    date: string;
    requestCount: number;
    blockedCount: number;
    bytes: number;
    downloadBytes?: number;
    uploadBytes?: number;
  }>;
}

export function RequestsChart({ data }: RequestsChartProps) {
  const [metricMode, setMetricMode] = useState<'requests' | 'bandwidth'>('requests');
  const [viewAsTable, setViewAsTable] = useState(false);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      formattedDate: formatDate(item.date),
      downloadBytes: item.downloadBytes ?? 0,
      uploadBytes: item.uploadBytes ?? 0,
    }));
  }, [data]);

  const summary = useMemo(() => {
    const totalRequests = chartData.reduce((acc, c) => acc + (c.requestCount || 0), 0);
    const totalBlocked = chartData.reduce((acc, c) => acc + (c.blockedCount || 0), 0);
    const totalBytes = chartData.reduce((acc, c) => acc + (c.bytes || 0), 0);
    const totalDown = chartData.reduce((acc, c) => acc + (c.downloadBytes || 0), 0);
    const totalUp = chartData.reduce((acc, c) => acc + (c.uploadBytes || 0), 0);
    return { totalRequests, totalBlocked, totalBytes, totalDown, totalUp };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-slate-300">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50 text-blue-400" />
        <p className="text-sm">No activity recorded for this date / IP filter range.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        Proxy analytics summary: Total requests {formatNumber(summary.totalRequests)}, Blocked policy events {formatNumber(summary.totalBlocked)}, Total transfer {formatBytes(summary.totalBytes)} (Download {formatBytes(summary.totalDown)}, Upload {formatBytes(summary.totalUp)}).
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Requests &amp; Bandwidth Over Time
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {metricMode === 'requests'
              ? 'Adaptive time-series tracking total requests and blocked security events'
              : 'Adaptive transfer volume separated by Inbound (Download) and Outbound (Upload)'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric Selector Toggle */}
          <div className="inline-flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('requests')}
              aria-pressed={metricMode === 'requests'}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'requests'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Requests (Total &amp; Blocked)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('bandwidth')}
              aria-pressed={metricMode === 'bandwidth'}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'bandwidth'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Bandwidth (In / Out)
            </button>
          </div>

          {/* Table Toggle Button */}
          <button
            type="button"
            onClick={() => setViewAsTable((prev) => !prev)}
            aria-pressed={viewAsTable}
            aria-label={viewAsTable ? 'Switch to interactive chart view' : 'Switch to accessible data table view'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {viewAsTable ? (
              <>
                <ChartIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>View Chart</span>
              </>
            ) : (
              <>
                <TableIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>View as Table</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewAsTable ? (
        <div className="h-72 w-full overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Squid Web Proxy Analytics Over Time</caption>
            <thead className="bg-slate-950/80 sticky top-0 z-10 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th scope="col" className="py-2 px-3">Timestamp</th>
                {metricMode === 'requests' ? (
                  <>
                    <th scope="col" className="py-2 px-3 text-right text-blue-400">Total Requests</th>
                    <th scope="col" className="py-2 px-3 text-right text-rose-400">Blocked Requests</th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="py-2 px-3 text-right text-emerald-400">Download ⬇</th>
                    <th scope="col" className="py-2 px-3 text-right text-purple-400">Upload ⬆</th>
                    <th scope="col" className="py-2 px-3 text-right text-blue-400">Total Volume</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 whitespace-nowrap">{row.formattedDate}</td>
                  {metricMode === 'requests' ? (
                    <>
                      <td className="py-1.5 px-3 text-right text-blue-300">{formatNumber(row.requestCount)}</td>
                      <td className="py-1.5 px-3 text-right text-rose-300">{formatNumber(row.blockedCount)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5 px-3 text-right text-emerald-300">{formatBytes(row.downloadBytes)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-300">{formatBytes(row.uploadBytes)}</td>
                      <td className="py-1.5 px-3 text-right text-blue-300 font-bold">{formatBytes(row.bytes)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === 'requests' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  width={50}
                  domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 'auto')]}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  tickFormatter={(val) => formatCompactNumber(val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any) => [
                    formatNumber(Number(value)),
                    name === 'requestCount' ? 'Total Requests' : name === 'blockedCount' ? 'Blocked Requests (Dashed)' : name,
                  ]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-slate-300">
                      {value === 'requestCount' ? 'Total Requests' : 'Blocked Requests (Dashed)'}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="requestCount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRequests)"
                  name="requestCount"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="blockedCount"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorBlocked)"
                  name="blockedCount"
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSquidTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSquidDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSquidUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  width={56}
                  domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 'auto')]}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  tickFormatter={(val) => formatBytes(val, 0)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any) => {
                    const num = Number(value);
                    if (name === 'bytes') return [formatBytes(num), 'Total Bandwidth'];
                    if (name === 'downloadBytes') return [formatBytes(num), 'Download (⬇ Inbound)'];
                    if (name === 'uploadBytes') return [formatBytes(num), 'Upload (⬆ Outbound)'];
                    return [formatBytes(num), name];
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => {
                    if (value === 'bytes') return <span className="text-xs text-blue-300">Total Volume</span>;
                    if (value === 'downloadBytes') return <span className="text-xs text-emerald-300">⬇ Download</span>;
                    if (value === 'uploadBytes') return <span className="text-xs text-purple-300">⬆ Upload (Dashed)</span>;
                    return <span className="text-xs text-slate-300">{value}</span>;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bytes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSquidTotal)"
                  name="bytes"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="downloadBytes"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSquidDown)"
                  name="downloadBytes"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="uploadBytes"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorSquidUp)"
                  name="uploadBytes"
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
