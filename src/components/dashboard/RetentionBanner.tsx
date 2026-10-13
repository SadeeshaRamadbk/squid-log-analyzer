'use client';

import React, { useState, useEffect } from 'react';
import { Database, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface RetentionInfo {
  rawLogCount: number;
  summaryCount: number;
  lastRun: {
    deletedRows: number;
    executedAt: string;
    retentionDays: number;
  } | null;
}

export function RetentionBanner({ onRetentionTriggered }: { onRetentionTriggered?: () => void }) {
  const [info, setInfo] = useState<RetentionInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
        body: JSON.stringify({ retentionDays: 60 }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Cleaned ${data.result.deletedRows} rows older than 60 days.`);
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

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">SQLite Storage:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
            WAL MODE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Raw Logs (60-day window):</span>
          <span className="font-mono text-slate-200 font-semibold">
            {info ? formatNumber(info.rawLogCount) : '...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Daily Summary Records:</span>
          <span className="font-mono text-slate-200 font-semibold">
            {info ? formatNumber(info.summaryCount) : '...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Retention: Raw rows &gt;60d purged daily</span>
        </div>
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
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          title="Manually trigger 60-day retention prune"
        >
          <Trash2 className="w-3 h-3 text-rose-400" />
          {isRunning ? 'Pruning...' : 'Prune Old Rows (>60d)'}
        </button>
      </div>
    </div>
  );
}
