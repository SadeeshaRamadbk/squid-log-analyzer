'use client';

import React, { useState, useEffect } from 'react';
import { CheckCheck, Bell, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff, Clock, Moon, User } from 'lucide-react';
import type { SecurityAlert } from '@/lib/alerts';

interface AlertsPanelProps {
  onSelectIp?: (ip: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function AlertsPanel({ onSelectIp }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissingOld, setDismissingOld] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<number | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alerts');
      const json = await res.json();
      if (json.success && Array.isArray(json.alerts)) {
        setAlerts(json.alerts);
        setCurrentTime(Date.now());
      }
    } catch (err) {
      console.warn('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentTime(Date.now());
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async (id: number, status: 'acknowledged' | 'dismissed') => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert', err);
    }
  };

  const handleSnooze = async (id: number, snoozeDuration: '1h' | '1d' | '7d') => {
    try {
      setSnoozeMenuOpenId(null);
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'snooze', snoozeDuration }),
      });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to snooze alert', err);
    }
  };

  const handleDismissOld = async () => {
    try {
      setDismissingOld(true);
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_old', olderThanMinutes: 60 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to dismiss old alerts', err);
    } finally {
      setDismissingOld(false);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  const oneHourAgo = (currentTime || 0) - 60 * 60 * 1000;
  const oldAlertsCount = currentTime ? activeAlerts.filter((a) => a.timestamp < oneHourAgo).length : 0;

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl shadow-lg transition-all duration-200">
      {/* Header bar / Collapsible toggle */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Bell className={`w-4 h-4 ${isOpen ? '' : 'animate-bounce'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-100">
                Security Alerts & Anomalies
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono">
                {activeAlerts.length} active ({criticalCount} critical)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated anomaly detection across Nippon BPO proxy and NetFlow feeds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <button
            type="button"
            onClick={handleDismissOld}
            disabled={dismissingOld || loading || oldAlertsCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              oldAlertsCount > 0
                ? `Dismiss ${oldAlertsCount} active alert(s) older than 1 hour`
                : 'No active alerts older than 1 hour'
            }
          >
            <CheckCheck className={`w-3.5 h-3.5 ${dismissingOld ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
            <span>Dismiss Old{oldAlertsCount > 0 ? ` (${oldAlertsCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            aria-label="Refresh alerts"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer shadow-sm"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Alerts</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Alerts</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Alerts Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-2 max-h-72 overflow-y-auto">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : alert.severity === 'high'
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-slate-800/40 border-slate-700 text-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      alert.severity === 'critical'
                        ? 'bg-rose-600 text-white'
                        : alert.severity === 'high'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-semibold text-slate-100">{alert.title}</span>

                  {/* Occurrence badge if grouped */}
                  {alert.occurrenceCount && alert.occurrenceCount > 1 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      x{alert.occurrenceCount}
                    </span>
                  )}

                  {/* Employee Name Alias or IP */}
                  {alert.sourceIp && (
                    <div className="inline-flex items-center gap-1">
                      {alert.employeeName ? (
                        <button
                          type="button"
                          onClick={() => onSelectIp?.(alert.sourceIp!)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-300 hover:text-indigo-200 hover:underline cursor-pointer"
                        >
                          <User className="w-3 h-3" />
                          <span>{alert.employeeName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({alert.sourceIp})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectIp?.(alert.sourceIp!)}
                          className="font-mono text-cyan-300 hover:underline cursor-pointer"
                        >
                          [{alert.sourceIp}]
                        </button>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono ml-auto sm:ml-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {formatTimeAgo(alert.timestamp)}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{alert.description}</p>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdate(alert.id, 'acknowledged')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>

                {/* Snooze Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSnoozeMenuOpenId(snoozeMenuOpenId === alert.id ? null : alert.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-[11px] font-medium transition-colors cursor-pointer border border-amber-500/20"
                    title="Snooze this alert"
                  >
                    <Moon className="w-3 h-3" />
                    <span>Snooze</span>
                  </button>
                  {snoozeMenuOpenId === alert.id && (
                    <div className="absolute right-0 bottom-full mb-1 z-30 w-28 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => handleSnooze(alert.id, '1h')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(alert.id, '1d')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        1 Day
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(alert.id, '7d')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        7 Days
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdate(alert.id, 'dismissed')}
                  className="px-2 py-1 rounded bg-slate-800/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-[11px] transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
