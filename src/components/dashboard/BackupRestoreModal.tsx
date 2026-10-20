'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatBytes } from '@/lib/formatters';
import { useAuth } from '../auth/AuthContext';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function BackupRestoreModal({ isOpen, onClose, onRestored }: BackupRestoreModalProps) {
  const { isAdmin } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    if (!isAdmin) {
      setError('Admin role required to download database backups');
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to download backup');
      }

      // Extract filename from headers or default
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'squid_analytics_backup.db';
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Backup "${filename}" downloaded successfully.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error creating database dump');
    } finally {
      setDownloading(false);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Database Backup & Migration</h2>
              <p className="text-xs text-slate-400">
                Dump SQLite database for migration or restore on a new machine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data Protection & Privacy Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This database contains sensitive employee network telemetry and web access logs for nipponbpo.local. SSH credentials and external API tokens are strictly isolated in server-side environment variables and excluded from database backups. Ensure downloaded files are handled according to internal data privacy policies.
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
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  1. Dump & Download Database
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Generates an atomic, fully checkpointed SQLite snapshot including all logs, daily summaries, and IP user mappings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating SQLite Snapshot...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Complete Database Backup (.db)
                </>
              )}
            </button>
          </div>

          {/* Section 2: Restore from Backup */}
          <form onSubmit={handleRestoreSubmit} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                2. Restore Database onto this Machine
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Move your database to another machine by simply uploading the exported backup file here.
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
                <span className="text-[10px] text-slate-500">Supported formats: SQLite .db database files</span>
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
              disabled={!selectedFile || restoring}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              {restoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying & Restoring Database...
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
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
