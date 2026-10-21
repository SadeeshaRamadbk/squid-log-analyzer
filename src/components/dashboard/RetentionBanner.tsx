'use client';

import React, { useState, useEffect } from 'react';
import { Database, Clock, HardDrive, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface RetentionInfo {
  rawLogCount: number;
  summaryCount: number;
  squid: {
    rawLogCount: number;
    summaryCount: number;
    retentionDays: number;
  };
  netflow: {
    rawFlowCount: number;
    minuteRollupCount?: number;
    hourlyRollupCount?: number;
    summaryCount: number;
    retentionDays: number;
  };
  dbSizeFormatted?: string;
  lastRun: {
    deletedRows: number;
    squidDeletedRows?: number;
    netflowDeletedRows?: number;
    executedAt: string;
    retentionDays?: number;
  } | null;
}

interface RetentionBannerProps {
  activeView?: 'squid' | 'softflowd' | 'split';
  onRetentionTriggered?: () => void;
}

export function RetentionBanner({ activeView = 'squid', onRetentionTriggered }: RetentionBannerProps) {
  const [info, setInfo] = useState<RetentionInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('retention_banner_collapsed');
      if (saved === 'true') setIsCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('retention_banner_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/retention');
      const data = await res.json();
      if (data.success) {
        setInfo(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleManualRetention = async () => {
    setIsRunning(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squidDays: 60,
          netflowDays: 7,
          runVacuum: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Cleaned ${data.result.deletedRows} rows successfully.`);
        await fetchStatus();
        onRetentionTriggered?.();
      } else {
        setStatusMsg(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setIsRunning(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const isPfSense = activeView === 'softflowd';
  const isSplit = activeView === 'split';

  if (isCollapsed) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-[11px]">Storage:</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">WAL</span>
            {info?.dbSizeFormatted && (
              <span className="font-mono text-slate-300 text-[11px]">{info.dbSizeFormatted}</span>
            )}
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {isPfSense
              ? `Flows: ${info ? formatNumber(info.netflow.rawFlowCount) : '...'}`
              : isSplit
              ? `Squid: ${info ? formatNumber(info.squid.rawLogCount) : '...'} | Flows: ${info ? formatNumber(info.netflow.rawFlowCount) : '...'}`
              : `Proxy: ${info ? formatNumber(info.squid.rawLogCount) : '...'} raw | Daily: ${info ? formatNumber(info.squid.summaryCount) : '...'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-emerald-400 font-medium inline-flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              {statusMsg}
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
            title="Expand storage and retention details"
          >
            <span>Expand</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-4">
        {/* SQLite Storage & WAL Status */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">SQLite Storage:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
            WAL MODE
          </span>
          {info?.dbSizeFormatted && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
              <HardDrive className="w-2.5 h-2.5 text-blue-400" />
              {info.dbSizeFormatted}
            </span>
          )}
        </div>

        {/* Context-aware metrics */}
        {isPfSense ? (
          <>
            <div className="flex items-center gap-2">
              <span>Raw Flows (7d retention):</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? formatNumber(info.netflow.rawFlowCount) : '...'}
              </span>
            </div>
            {info?.netflow.minuteRollupCount !== undefined && (
              <div className="flex items-center gap-2">
                <span>Roll-ups (Min / Hr):</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {formatNumber(info.netflow.minuteRollupCount)} / {formatNumber(info.netflow.hourlyRollupCount || 0)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span>Daily Aggregates:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? formatNumber(info.netflow.summaryCount) : '...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Retention: Raw &gt;7d pruned (Roll-ups kept for reports)</span>
            </div>
          </>
        ) : isSplit ? (
          <>
            <div className="flex items-center gap-2">
              <span>Squid Logs:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? `${formatNumber(info.squid.rawLogCount)} raw / ${formatNumber(info.squid.summaryCount)} sum` : '...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>pfSense Flows:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? `${formatNumber(info.netflow.rawFlowCount)} raw / ${formatNumber(info.netflow.summaryCount)} sum` : '...'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span>Raw Proxy Logs (60-day window):</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? formatNumber(info.squid.rawLogCount) : '...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Daily Web Summaries:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {info ? formatNumber(info.squid.summaryCount) : '...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Retention: Logs &gt;60d purged</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {statusMsg && (
          <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusMsg}
          </span>
        )}
        <button
          type="button"
          onClick={handleManualRetention}
          disabled={isRunning}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer text-[11px]"
          title="Run SQLite optimization and enforce retention policy"
        >
          {isRunning ? 'Running Purge...' : 'Run Purge Now'}
        </button>
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Collapse storage bar"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
