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
import { TrendingUp, BarChart2 } from 'lucide-react';
import { formatDate, formatNumber, formatBytes } from '@/lib/formatters';

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

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      formattedDate: formatDate(item.date),
      downloadBytes: item.downloadBytes ?? 0,
      uploadBytes: item.uploadBytes ?? 0,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-slate-400">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No activity recorded for this date / IP filter range.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Requests & Bandwidth Over Time
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {metricMode === 'requests'
              ? 'Adaptive time-series tracking total requests and blocked security events'
              : 'Adaptive transfer volume separated by Inbound (Download) and Outbound (Upload)'}
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="inline-flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode('requests')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              metricMode === 'requests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Requests (Total & Blocked)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('bandwidth')}
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
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === 'requests' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => formatNumber(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                formatter={(value: any, name: any) => [
                  formatNumber(Number(value)),
                  name === 'requestCount' ? 'Total Requests' : name === 'blockedCount' ? 'Blocked Requests' : name,
                ]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-slate-300">
                    {value === 'requestCount' ? 'Total Requests' : 'Blocked Requests'}
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
                fillOpacity={1}
                fill="url(#colorBlocked)"
                name="blockedCount"
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => formatBytes(val, 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                formatter={(value: any, name: any) => {
                  const num = Number(value);
                  if (name === 'bytes') return [formatBytes(num), 'Total Bandwidth'];
                  if (name === 'downloadBytes') return [formatBytes(num), 'Download (Inbound)'];
                  if (name === 'uploadBytes') return [formatBytes(num), 'Upload (Outbound)'];
                  return [formatBytes(num), name];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => {
                  if (value === 'bytes') return <span className="text-xs text-blue-300">Total Volume</span>;
                  if (value === 'downloadBytes') return <span className="text-xs text-emerald-300">Download (Inbound)</span>;
                  if (value === 'uploadBytes') return <span className="text-xs text-purple-300">Upload (Outbound)</span>;
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
                fillOpacity={1}
                fill="url(#colorSquidUp)"
                name="uploadBytes"
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
