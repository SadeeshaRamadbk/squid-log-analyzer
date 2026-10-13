'use client';

import React, { useState, useEffect } from 'react';
import { Globe, X, ExternalLink, ShieldAlert, CheckCircle, Users, Activity } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface DomainDetailModalProps {
  domain: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFilterByDomain?: (domain: string) => void;
  onViewIpProfile?: (ip: string) => void;
}

export function DomainDetailModal({
  domain,
  isOpen,
  onClose,
  onFilterByDomain,
  onViewIpProfile,
}: DomainDetailModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !domain) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/drilldown/domain?domain=${encodeURIComponent(domain)}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success) setData(json.data);
          else setError(json.error || 'Failed to load domain details');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading domain details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, domain]);

  if (!isOpen || !domain) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{domain}</h3>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-cyan-300"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-slate-400">Domain Drill-Down & Audit Telemetry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Activity className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Fetching domain telemetry...</span>
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">{error}</div>}

          {data && !loading && (
            <>
              {/* Overview KPI Mini-cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total Requests</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {formatNumber(data.totalRequests)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total Bandwidth</div>
                  <div className="text-lg font-bold text-cyan-300 font-mono mt-1">
                    {formatBytes(data.totalBytes)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Blocked Attempts</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${data.blockedCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {formatNumber(data.blockedCount)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Active Workstations</div>
                  <div className="text-lg font-bold text-amber-300 font-mono mt-1">
                    {data.topClients.length} hosts
                  </div>
                </div>
              </div>

              {/* Time Range */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span>First Seen: <span className="text-slate-200 font-mono">{data.firstSeen}</span></span>
                <span>Last Seen: <span className="text-slate-200 font-mono">{data.lastSeen}</span></span>
              </div>

              {/* Top Internal Workstations Visiting Domain */}
              <div>
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 mb-2.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Top Visiting Workstations
                </h4>
                {data.topClients.length === 0 ? (
                  <p className="text-slate-500 italic">No specific clients recorded.</p>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <th className="p-2.5">Client IP / User</th>
                          <th className="p-2.5 text-right">Requests</th>
                          <th className="p-2.5 text-right">Volume</th>
                          <th className="p-2.5 text-right">Blocked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {data.topClients.map((c: any) => (
                          <tr key={c.clientIp} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono">
                              <button
                                type="button"
                                onClick={() => onViewIpProfile?.(c.clientIp)}
                                className="text-indigo-300 hover:underline font-semibold cursor-pointer text-left"
                              >
                                {c.userName ? `${c.userName} (${c.clientIp})` : c.clientIp}
                              </button>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-200">{formatNumber(c.requestCount)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-300">{formatBytes(c.bytes)}</td>
                            <td className="p-2.5 text-right font-mono">
                              {c.blockedCount > 0 ? (
                                <span className="text-rose-400 font-bold">{c.blockedCount}</span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
