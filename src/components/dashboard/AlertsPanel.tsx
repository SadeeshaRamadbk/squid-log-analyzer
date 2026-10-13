'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Bell, RefreshCw } from 'lucide-react';
import type { SecurityAlert } from '@/lib/alerts';

interface AlertsPanelProps {
  onSelectIp?: (ip: string) => void;
}

export function AlertsPanel({ onSelectIp }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alerts');
      const json = await res.json();
      if (json.success && Array.isArray(json.alerts)) {
        setAlerts(json.alerts);
      }
    } catch (err) {
      console.warn('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  if (activeAlerts.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Security Alerts & Anomalies
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono">
                {activeAlerts.length} active ({criticalCount} critical)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Automated anomaly detection across Nippon BPO proxy and NetFlow feeds
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAlerts}
          disabled={loading}
          aria-label="Refresh alerts"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
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
              <div className="flex items-center gap-2">
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
                {alert.sourceIp && (
                  <button
                    type="button"
                    onClick={() => onSelectIp?.(alert.sourceIp!)}
                    className="font-mono text-cyan-300 hover:underline cursor-pointer"
                  >
                    [{alert.sourceIp}]
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-[11px]">{alert.description}</p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => handleUpdate(alert.id, 'acknowledged')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
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
    </div>
  );
}
