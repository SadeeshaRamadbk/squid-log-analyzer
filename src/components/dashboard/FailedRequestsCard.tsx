'use client';

import React, { useState, useEffect } from 'react';
import { AlertOctagon, ShieldAlert, Globe, User, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import type { FailedRequestSummary } from '@/lib/db/queries';

interface FailedRequestsCardProps {
  startDate?: string;
  endDate?: string;
  clientIp?: string;
  timeWindow?: '30m' | '1h';
  onSelectIp?: (ip: string) => void;
  onSelectDomain?: (domain: string) => void;
}

export function FailedRequestsCard({
  startDate,
  endDate,
  clientIp,
  timeWindow,
  onSelectIp,
  onSelectDomain,
}: FailedRequestsCardProps) {
  const [data, setData] = useState<FailedRequestSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (clientIp) params.append('clientIp', clientIp);
      if (timeWindow) params.append('timeWindow', timeWindow);

      const res = await fetch(`/api/squid/errors?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('Failed to load error stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [startDate, endDate, clientIp, timeWindow]);

  if (!data || data.totalFailed === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-emerald-400" />
          <span>Zero Squid proxy errors (503/403/504) detected in this window</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Failed Requests & Error Rates
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/40">
                {data.failureRate}% failure rate
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatNumber(data.totalFailed)} failed out of {formatNumber(data.totalRequests)} total requests
            </p>
          </div>
        </div>

        {/* By Result Code Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {data.byResultCode.map((c) => (
            <span
              key={c.resultCode}
              className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-200"
              title={`${c.percentage}% of failures`}
            >
              <strong className="text-rose-400">{c.resultCode}</strong>: {formatNumber(c.count)}
            </span>
          ))}
        </div>
      </div>

      {/* Grid: Top Failed Domains vs Top Responsible Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Top Failed Domains */}
        <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Top Failing Domains
          </span>
          <div className="divide-y divide-slate-800/40">
            {data.topFailedDomains.map((d) => (
              <div key={d.domain} className="py-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectDomain?.(d.domain)}
                  className="truncate text-left text-slate-200 hover:text-cyan-300 hover:underline cursor-pointer"
                  title={d.domain}
                >
                  {d.domain}
                </button>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="text-slate-400 text-[10px]">({d.sampleResultCode})</span>
                  <span className="font-semibold text-rose-400">{formatNumber(d.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Failed Clients */}
        <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            Top Clients Experiencing Errors
          </span>
          <div className="divide-y divide-slate-800/40">
            {data.topFailedClients.map((c) => (
              <div key={c.clientIp} className="py-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectIp?.(c.clientIp)}
                  className="truncate text-left text-slate-200 hover:text-indigo-300 hover:underline cursor-pointer"
                  title={c.clientIp}
                >
                  <span className="font-mono text-indigo-300">{c.clientIp}</span>
                  {c.userName && <span className="ml-1.5 text-slate-400">({c.userName})</span>}
                </button>
                <span className="font-mono font-semibold text-rose-400 shrink-0">
                  {formatNumber(c.count)} errs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
