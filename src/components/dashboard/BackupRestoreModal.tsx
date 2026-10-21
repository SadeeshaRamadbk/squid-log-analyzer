'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldAlert,
  Gauge,
  Clock,
  FileCheck,
} from 'lucide-react';
import { formatBytes } from '@/lib/formatters';
import { useAuth } from '../auth/AuthContext';
import type { BackupProgressInfo } from '@/lib/db/backup-manager';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function BackupRestoreModal({ isOpen, onClose, onRestored }: BackupRestoreModalProps) {
  const { isAdmin } = useAuth();
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<BackupProgressInfo | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const triggerDirectBrowserDownload = (downloadUrl: string, filename?: string) => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleStartBackup = async () => {
    if (!isAdmin) {
      setError('Admin role required to download database backups');
      return;
    }

    setDownloadState('preparing');
    setError(null);
    setProgress(null);

    try {
      const res = await fetch('/api/backup/prepare', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize database backup');
      }

      const initialJob: BackupProgressInfo = data.job;
      setActiveJobId(initialJob.jobId);
      setProgress(initialJob);

      // Start status polling every 500ms
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/backup/status?jobId=${initialJob.jobId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          if (statusData.success && statusData.job) {
            const currentJob: BackupProgressInfo = statusData.job;
            setProgress(currentJob);

            if (currentJob.status === 'ready') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setDownloadState('ready');
              setSuccess(`Snapshot ready (${formatBytes(currentJob.fileSizeBytes || 0)}). Starting direct browser download...`);

              if (currentJob.downloadUrl) {
                triggerDirectBrowserDownload(currentJob.downloadUrl, currentJob.filename);
              }
            } else if (currentJob.status === 'error') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setDownloadState('error');
              setError(currentJob.error || 'Database backup preparation failed');
            }
          }
        } catch (pollErr: any) {
          console.warn('Backup poll error:', pollErr);
        }
      }, 500);
    } catch (err: any) {
      setDownloadState('error');
      setError(err.message || 'Error preparing database snapshot');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Admin role required to restore database backups');
      return;
    }
    if (!selectedFile) {
      setError('Please select a backup file (.db) to restore');
      return;
    }

    if (!confirm('Are you sure you want to restore this database? The current database will be replaced with the contents of the backup.')) {
      return;
    }

    setRestoring(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('backupFile', selectedFile);

    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(
          `Database successfully restored! (Raw Logs: ${json.stats.rawLogs}, Summaries: ${json.stats.dailySummaries}, IP Mappings: ${json.stats.ipMappings})`
        );
        setSelectedFile(null);
        onRestored();
      } else {
        setError(json.error || 'Failed to restore database');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading and restoring backup');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Database Backup & Migration</h2>
              <p className="text-xs text-slate-400">
                Large file streaming dump & restore for databases up to 20+ GB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data Protection & Privacy Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This database contains employee network telemetry and proxy logs for nipponbpo.local. External API tokens and passwords are fully isolated. Downloaded files stream directly to disk without intermediate RAM buffering.
            </p>
          </div>

          {!isAdmin && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Viewer Role Active: Admin privileges are required to create or restore database snapshots.</span>
            </div>
          )}

          {/* Notifications */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Section 1: Dump & Download Backup */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  1. Dump & Download Database (10 - 20+ GB Ready)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Safely consolidates live WAL journal frames into an atomic, uncorrupted SQLite snapshot, then streams it directly to your browser download manager.
                </p>
              </div>
            </div>

            {/* Preparation in Progress Box */}
            {downloadState === 'preparing' && progress && (
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    Preparing SQLite Snapshot...
                  </span>
                  <span className="font-mono font-bold text-blue-200">
                    {progress.progressPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(3, progress.progressPercent)}%` }}
                  />
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Processed</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {formatBytes(progress.copiedBytes)} / {formatBytes(progress.totalEstimatedBytes || progress.copiedBytes)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" /> Speed
                    </span>
                    <span className="font-mono text-cyan-300 font-medium">
                      {progress.speedBytesPerSec > 0 ? `${formatBytes(progress.speedBytesPerSec)}/s` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> Remaining
                    </span>
                    <span className="font-mono text-amber-300 font-medium">
                      {progress.etaSeconds > 0 ? `~${progress.etaSeconds}s` : 'Almost ready'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Note: Page batches ({progress.copiedPages.toLocaleString()} / {progress.totalPages.toLocaleString()} pages) are being consolidated. Do not close this modal.
                </p>
              </div>
            )}

            {/* Snapshot Ready Box */}
            {downloadState === 'ready' && progress && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Snapshot Ready ({formatBytes(progress.fileSizeBytes || 0)})
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">100% Prepared</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Your browser download should start automatically. If it was blocked by popup preferences, click below to stream directly:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={progress.downloadUrl}
                    download={progress.filename}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File Now ({formatBytes(progress.fileSizeBytes || 0)})
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadState('idle');
                      setProgress(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    New Dump
                  </button>
                </div>
              </div>
            )}

            {downloadState !== 'preparing' && downloadState !== 'ready' && (
              <button
                type="button"
                onClick={handleStartBackup}
                disabled={!isAdmin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Prepare & Stream Complete Database Backup (.db)
              </button>
            )}
          </div>

          {/* Section 2: Restore from Backup */}
          <form onSubmit={handleRestoreSubmit} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                2. Restore Database onto this Machine
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Move your database to another machine by uploading the exported backup file. Uploads stream directly to disk without memory limits.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center">
              <input
                type="file"
                id="backup-upload"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="backup-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                <HardDrive className="w-6 h-6 text-slate-500 mb-1" />
                {selectedFile ? (
                  <span className="font-mono text-amber-300 font-medium">
                    {selectedFile.name} ({formatBytes(selectedFile.size)})
                  </span>
                ) : (
                  <span>Click to select or drop backup file (.db)</span>
                )}
                <span className="text-[10px] text-slate-500">Supports standard SQLite .db files up to 20+ GB</span>
              </label>
            </div>

            {selectedFile && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Restoring will overwrite current logs with the contents of this file.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || restoring || !isAdmin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              {restoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Streaming, Verifying & Restoring Database...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Restore Selected Backup File
                </>
              )}
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
