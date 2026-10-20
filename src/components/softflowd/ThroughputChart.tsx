'use client';

import React, { useMemo } from 'react';
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
import { Activity } from 'lucide-react';
import { formatDate, formatBytes, formatNumber } from '@/lib/formatters';

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
        <Activity className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
        <p className="text-sm">No NetFlow data recorded for the selected filter range.</p>
        <p className="text-xs text-slate-500 mt-1">Ensure softflowd on pfSense is actively exporting to UDP port 2055.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Network Bandwidth Over Time (Download vs Upload vs Total)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ingress, egress, and total volume captured by softflowd 1.2.6_4
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Download
          </span>
          <span className="flex items-center gap-1.5 text-purple-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            Upload
          </span>
          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Total
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              yAxisId="bytes"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val) => formatBytes(val, 0)}
            />
            <YAxis
              yAxisId="flows"
              orientation="right"
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
              formatter={(value: any, name: any) => {
                const num = Number(value);
                if (name === 'downloadBytes') return [formatBytes(num), 'Download (Inbound)'];
                if (name === 'uploadBytes') return [formatBytes(num), 'Upload (Outbound)'];
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
                if (value === 'downloadBytes') return <span className="text-xs text-emerald-300 font-medium">Download</span>;
                if (value === 'uploadBytes') return <span className="text-xs text-purple-300 font-medium">Upload</span>;
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
            />
            <Area
              yAxisId="bytes"
              type="monotone"
              dataKey="uploadBytes"
              stroke="#a855f7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUpload)"
              name="uploadBytes"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
