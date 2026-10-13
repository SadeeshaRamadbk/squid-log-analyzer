'use client';

import React, { useState } from 'react';
import { FileText, Download, X, Calendar, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import type { GeneratedReportResult } from '@/lib/reports';

interface ScheduledReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduledReportsModal({ isOpen, onClose }: ScheduledReportsModalProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<GeneratedReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reports?type=${reportType}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.report);
      } else {
        setError(json.error || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!reportData) return;
    const blob = new Blob([reportData.docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NipponBPO_${reportData.type.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-blue-400">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Scheduled Reports & AI Summary</h3>
              <p className="text-xs text-slate-400">
                Generate executive Word documents (.doc) with NVIDIA NIM AI analysis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule Selector */}
        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Select Report Frequency:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReportType('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                reportType === 'daily'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily (24h)
            </button>
            <button
              type="button"
              onClick={() => setReportType('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                reportType === 'weekly'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly (7 Days)
            </button>
          </div>
        </div>

        {/* Generated Report Preview */}
        {reportData && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>NIM AI Executive Summary Ready</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic bg-emerald-950/20 p-3 rounded-lg border border-emerald-800/30">
              "{reportData.aiSummary}"
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Timezone: Asia/Colombo (UTC+5:30)</span>
              <span>Scope: {reportData.type.toUpperCase()} Telemetry</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            NIM API key configured securely server-side (.env.local)
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Generating AI Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Generate Now
                </>
              )}
            </button>

            {reportData && (
              <button
                type="button"
                onClick={handleDownloadDoc}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download Word (.doc)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
