'use client';

import React, { useMemo, useState } from 'react';
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
import { Activity, Table as TableIcon, LineChart as ChartIcon, ArrowDown, ArrowUp } from 'lucide-react';
import { formatDate, formatBytes, formatNumber, formatCompactNumber } from '@/lib/formatters';

interface ThroughputChartProps {
  data: Array<{
    date: string;
    flowCount: number;
    bytes: number;
    downloadBytes?: number;
    uploadBytes?: number;
    packets: number;
  }>;
}

export function ThroughputChart({ data }: ThroughputChartProps) {
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
    const totalBytes = chartData.reduce((acc, c) => acc + (c.bytes || 0), 0);
    const totalDownload = chartData.reduce((acc, c) => acc + (c.downloadBytes || 0), 0);
    const totalUpload = chartData.reduce((acc, c) => acc + (c.uploadBytes || 0), 0);
    const totalFlows = chartData.reduce((acc, c) => acc + (c.flowCount || 0), 0);
    return { totalBytes, totalDownload, totalUpload, totalFlows };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-slate-300">
        <Activity className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
        <p className="text-sm">No NetFlow data recorded for the selected filter range.</p>
        <p className="text-xs text-slate-400 mt-1">Ensure softflowd on pfSense is actively exporting to UDP port 2055.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        Network throughput summary: Total volume {formatBytes(summary.totalBytes)}, Inbound download {formatBytes(summary.totalDownload)}, Outbound upload {formatBytes(summary.totalUpload)}, across {formatNumber(summary.totalFlows)} sessions.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Network Bandwidth Over Time (Download vs Upload vs Total)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ingress, egress, and total volume captured by softflowd 1.2.6_4
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ArrowDown className="w-3 h-3 text-emerald-400" />
              Download
            </span>
            <span className="flex items-center gap-1 text-purple-400 font-medium">
              <ArrowUp className="w-3 h-3 text-purple-400" />
              Upload (Dashed)
            </span>
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Total
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewAsTable((prev) => !prev)}
            aria-pressed={viewAsTable}
            aria-label={viewAsTable ? 'Switch to interactive chart view' : 'Switch to accessible data table view'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {viewAsTable ? (
              <>
                <ChartIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>View Chart</span>
              </>
            ) : (
              <>
                <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>View as Table</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewAsTable ? (
        <div className="h-72 w-full overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">NetFlow Bandwidth Telemetry Over Time</caption>
            <thead className="bg-slate-950/80 sticky top-0 z-10 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th scope="col" className="py-2 px-3">Timestamp</th>
                <th scope="col" className="py-2 px-3 text-right text-emerald-400">Download ⬇</th>
                <th scope="col" className="py-2 px-3 text-right text-purple-400">Upload ⬆</th>
                <th scope="col" className="py-2 px-3 text-right text-blue-400">Total Volume</th>
                <th scope="col" className="py-2 px-3 text-right">Flow Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 whitespace-nowrap">{row.formattedDate}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-300">{formatBytes(row.downloadBytes)}</td>
                  <td className="py-1.5 px-3 text-right text-purple-300">{formatBytes(row.uploadBytes)}</td>
                  <td className="py-1.5 px-3 text-right text-blue-300 font-bold">{formatBytes(row.bytes)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-300">{formatNumber(row.flowCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
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
                yAxisId="bytes"
                stroke="#94a3b8"
                fontSize={11}
                width={56}
                domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 'auto')]}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={(val) => formatBytes(val, 0)}
              />
              <YAxis
                yAxisId="flows"
                orientation="right"
                stroke="#94a3b8"
                fontSize={11}
                width={48}
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
                formatter={(value: any, name: any) => {
                  const num = Number(value);
                  if (name === 'downloadBytes') return [formatBytes(num), 'Download (⬇ Inbound)'];
                  if (name === 'uploadBytes') return [formatBytes(num), 'Upload (⬆ Outbound)'];
                  if (name === 'bytes') return [formatBytes(num), 'Total Volume'];
                  if (name === 'flowCount') return [formatNumber(num), 'Flow Sessions'];
                  return [num, name];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => {
                  if (value === 'downloadBytes') return <span className="text-xs text-emerald-300 font-medium">⬇ Download</span>;
                  if (value === 'uploadBytes') return <span className="text-xs text-purple-300 font-medium">⬆ Upload (Dashed)</span>;
                  if (value === 'bytes') return <span className="text-xs text-blue-300 font-medium">Total Volume</span>;
                  if (value === 'flowCount') return <span className="text-xs text-cyan-300 font-medium">Flows</span>;
                  return <span className="text-xs text-slate-300">{value}</span>;
                }}
              />
              <Area
                yAxisId="bytes"
                type="monotone"
                dataKey="bytes"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="bytes"
                isAnimationActive={false}
              />
              <Area
                yAxisId="bytes"
                type="monotone"
                dataKey="downloadBytes"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDownload)"
                name="downloadBytes"
                isAnimationActive={false}
              />
              <Area
                yAxisId="bytes"
                type="monotone"
                dataKey="uploadBytes"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorUpload)"
                name="uploadBytes"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
