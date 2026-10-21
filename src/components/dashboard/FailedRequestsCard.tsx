'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertOctagon, Globe, User, ShieldAlert, WifiOff, Check } from 'lucide-react';
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
  const [excludeConnect503, setExcludeConnect503] = useState(true);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (clientIp) params.append('clientIp', clientIp);
      if (timeWindow) params.append('timeWindow', timeWindow);
      if (excludeConnect503) params.append('excludeConnect503', 'true');

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
  }, [startDate, endDate, clientIp, timeWindow, excludeConnect503]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  if (loading && !data) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800" />
            <div className="space-y-1.5">
              <div className="w-48 h-4 rounded bg-slate-800" />
              <div className="w-32 h-3 rounded bg-slate-800/60" />
            </div>
          </div>
          <div className="w-32 h-6 rounded-lg bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="h-16 rounded-xl bg-slate-800/40 border border-slate-800/60" />
          <div className="h-16 rounded-xl bg-slate-800/40 border border-slate-800/60" />
          <div className="h-16 rounded-xl bg-slate-800/40 border border-slate-800/60" />
          <div className="h-16 rounded-xl bg-slate-800/40 border border-slate-800/60" />
        </div>
      </div>
    );
  }

  if (!data || (data.totalFailed === 0 && data.policyBlockedCount === 0)) {
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
      {/* Top Header: Failure Rates Breakdown & Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Failed Requests & Error Rates
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/40">
                {data.failureRate}% active failure rate
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatNumber(data.totalFailed)} failed out of {formatNumber(data.totalRequests)} total requests
            </p>
          </div>
        </div>

        {/* Separate Rates: Policy Blocks vs Tunnel Upstream Resets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Policy Blocks KPI */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Policy Blocks (403):</span>
            <strong className="text-rose-200">{data.policyBlockedRate}%</strong>
            <span className="text-[11px] font-semibold text-rose-300">({formatNumber(data.policyBlockedCount)})</span>
          </div>

          {/* Upstream/Tunnel Resets KPI */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Tunnel/503s:</span>
            <strong className="text-amber-200">{data.tunnelFailureRate}%</strong>
            <span className="text-[11px] font-semibold text-amber-300">({formatNumber(data.tunnelFailureCount)})</span>
          </div>

          {/* Toggle Button to Exclude CONNECT 503s */}
          <button
            type="button"
            onClick={() => setExcludeConnect503(!excludeConnect503)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              excludeConnect503
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="When active, client-initiated SSL tunnel resets (CONNECT 503) are excluded from the main failure rate calculation"
          >
            <div className={`w-3 h-3 rounded flex items-center justify-center border ${excludeConnect503 ? 'bg-indigo-600 border-indigo-400' : 'border-slate-600'}`}>
              {excludeConnect503 && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span>Exclude CONNECT 503s</span>
          </button>
        </div>
      </div>

      {/* Result Code Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mr-1">Error Codes:</span>
        {data.byResultCode.map((c) => (
          <span
            key={c.resultCode}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-200"
            title={`${c.percentage}% of failure results`}
          >
            <strong className={c.resultCode.includes('403') || c.resultCode.includes('DENIED') ? 'text-rose-400' : 'text-amber-400'}>
              {c.resultCode}
            </strong>
            : {formatNumber(c.count)}
          </span>
        ))}
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
