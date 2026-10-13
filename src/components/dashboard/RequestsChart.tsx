'use client';

import React from 'react';
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
import { TrendingUp } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/formatters';

interface RequestsChartProps {
  data: Array<{
    date: string;
    requestCount: number;
    blockedCount: number;
    bytes: number;
  }>;
}

export function RequestsChart({ data }: RequestsChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    formattedDate: formatDate(item.date),
    allowedCount: Math.max(0, item.requestCount - item.blockedCount),
  }));

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Requests Over Time
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated traffic volume and blocked security events per day
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
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
              labelFormatter={(label) => `Date: ${label}`}
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
            />
            <Area
              type="monotone"
              dataKey="blockedCount"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBlocked)"
              name="blockedCount"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
