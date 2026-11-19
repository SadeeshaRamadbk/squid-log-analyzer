'use client';

import React from 'react';
import {
  Globe,
  Server,
  Terminal,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
  User,
  Building,
  ChevronRight,
  Laptop,
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { HostSummaryItem } from '@/lib/db/profile-queries';
import { maskEmployeeName } from '@/lib/privacy';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface HostTableProps {
  hosts: HostSummaryItem[];
  selectedIp: string | null;
  onSelectHost: (ip: string) => void;
  maxBandwidth: number;
}

export function HostTable({ hosts, selectedIp, onSelectHost, maxBandwidth }: HostTableProps) {
  const isPrivacyMode = usePrivacyMode();

  if (hosts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Laptop className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No hosts found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No network hosts matched your current search or filter criteria. Try clearing search or selecting a different department.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-4 min-w-[200px]">Host & Employee</th>
              <th className="py-3 px-4 min-w-[170px]">Total Bandwidth</th>
              <th className="py-3 px-4 min-w-[200px]">Web Activity (Squid)</th>
              <th className="py-3 px-4 min-w-[200px]">Network Flows (pfSense)</th>
              <th className="py-3 px-4 min-w-[130px]">Syslog & Firewall</th>
              <th className="py-3 px-4 text-right w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {hosts.map((host) => {
              const isSelected = selectedIp === host.clientIp;
              const displayName = host.userName
                ? isPrivacyMode
                  ? maskEmployeeName(host.userName)
                  : host.userName
                : null;

              const bandwidthPct = maxBandwidth > 0
                ? Math.min(100, Math.max(3, Math.round((host.totalBandwidth / maxBandwidth) * 100)))
                : 0;

              return (
                <tr
                  key={host.clientIp}
                  onClick={() => onSelectHost(host.clientIp)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/30 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Column 1: Host & Employee */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          host.isMapped
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {host.isMapped ? <User className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {host.clientIp}
                          </span>
                          {displayName && (
                            <span className="font-medium text-slate-300 text-xs truncate max-w-[120px]">
                              {displayName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                          {host.department ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] flex items-center gap-1">
                              <Building className="w-2.5 h-2.5" />
                              {host.department}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Unassigned</span>
                          )}
                          {host.notes && (
                            <span className="text-slate-500 text-[10px] truncate max-w-[100px]" title={host.notes}>
                              • {host.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Total Bandwidth */}
                  <td className="py-3 px-4">
                    <div className="space-y-1 max-w-[140px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-100">
                          {formatBytes(host.totalBandwidth)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {bandwidthPct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${bandwidthPct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5 text-emerald-400/90">
                          <ArrowDownCircle className="w-2.5 h-2.5" /> {formatBytes(host.netflow.downloadBytes)}
                        </span>
                        <span className="flex items-center gap-0.5 text-blue-400/90">
                          <ArrowUpCircle className="w-2.5 h-2.5" /> {formatBytes(host.netflow.uploadBytes)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Column 3: Web Activity (Squid Proxy) */}
                  <td className="py-3 px-4">
                    {host.squid.totalRequests === 0 ? (
                      <span className="text-slate-600 text-[11px]">No web traffic</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-slate-200">
                            {formatNumber(host.squid.totalRequests)} reqs
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({formatBytes(host.squid.totalBytes)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {host.squid.topDomain && (
                            <span
                              className="font-mono text-slate-300 truncate max-w-[130px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                              title={`Top domain: ${host.squid.topDomain}`}
                            >
                              {host.squid.topDomain}
                            </span>
                          )}
                          {host.squid.blockedCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                              {host.squid.blockedCount} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Column 4: Network Flows (pfSense softflowd) */}
                  <td className="py-3 px-4">
                    {host.netflow.totalFlows === 0 ? (
                      <span className="text-slate-600 text-[11px]">No L3/L4 flows</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-semibold text-slate-200">
                            {formatNumber(host.netflow.totalFlows)} flows
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {host.netflow.topService && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium">
                              {host.netflow.topService}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Column 5: Syslog & Firewall */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Terminal className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-slate-300 font-medium">
                          {formatNumber(host.syslog.totalEvents)} events
                        </span>
                      </div>
                      {host.syslog.firewallBlocks > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold inline-block">
                          {host.syslog.firewallBlocks} firewall drops
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">0 drops</span>
                      )}
                    </div>
                  </td>

                  {/* Column 6: Action */}
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHost(host.clientIp);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Inspect 360° Host Dossier"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
