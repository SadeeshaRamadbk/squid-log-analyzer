'use client';

import React, { useState, useEffect } from 'react';
import { Tag, X, Activity, Server } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface PortDetailModalProps {
  port: number | null;
  protocol?: string;
  isOpen: boolean;
  onClose: () => void;
  onViewIpProfile?: (ip: string) => void;
}

export function PortDetailModal({
  port,
  protocol,
  isOpen,
  onClose,
  onViewIpProfile,
}: PortDetailModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !port) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const protoParam = protocol ? `&protocol=${encodeURIComponent(protocol)}` : '';
        const res = await fetch(`/api/drilldown/port?port=${port}${protoParam}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success) setData(json.data);
          else setError(json.error || 'Failed to load port details');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading port details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, port, protocol]);

  if (!isOpen || !port) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  {data?.serviceName || `Port ${port}`}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-purple-300 border border-slate-700 font-mono">
                  Port {port} {protocol ? `(${protocol})` : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400">Layer 4 Service Port Inspection</p>
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
              <Activity className="w-6 h-6 animate-spin text-purple-400" />
              <span>Fetching port flow statistics...</span>
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">{error}</div>}

          {data && !loading && (
            <>
              {/* Overview KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total Flows</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {formatNumber(data.totalFlows)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total Traffic</div>
                  <div className="text-lg font-bold text-purple-300 font-mono mt-1">
                    {formatBytes(data.totalBytes)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total Packets</div>
                  <div className="text-lg font-bold text-cyan-300 font-mono mt-1">
                    {formatNumber(data.totalPackets)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Active Endpoints</div>
                  <div className="text-lg font-bold text-emerald-300 font-mono mt-1">
                    {data.uniqueSources} src / {data.uniqueDestinations} dst
                  </div>
                </div>
              </div>

              {/* Time Range */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span>First Seen: <span className="text-slate-200 font-mono">{data.firstSeen}</span></span>
                <span>Last Seen: <span className="text-slate-200 font-mono">{data.lastSeen}</span></span>
              </div>

              {/* Top Talkers on this Port */}
              <div>
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 mb-2.5">
                  <Server className="w-4 h-4 text-amber-400" />
                  Top Talkers Using Port {port}
                </h4>
                {data.topTalkers.length === 0 ? (
                  <p className="text-slate-500 italic">No talkers recorded.</p>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <th className="p-2.5">Host / Employee</th>
                          <th className="p-2.5 text-right">Flow Sessions</th>
                          <th className="p-2.5 text-right">Total Volume</th>
                          <th className="p-2.5 text-right">Packets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {data.topTalkers.map((t: any) => (
                          <tr key={t.srcIp} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono">
                              <button
                                type="button"
                                onClick={() => onViewIpProfile?.(t.srcIp)}
                                className="text-indigo-300 hover:underline font-semibold cursor-pointer text-left"
                              >
                                {t.userName ? `${t.userName} (${t.srcIp})` : t.srcIp}
                              </button>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-200">{formatNumber(t.flowCount)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-300">{formatBytes(t.bytes)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-400">{formatNumber(t.packets)}</td>
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
