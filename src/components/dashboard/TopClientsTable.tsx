'use client';

import React from 'react';
import { Monitor, ShieldAlert, Download } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';
import { maskEmployeeName } from '@/lib/privacy';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface TopClientsTableProps {
  clients: Array<{
    clientIp: string;
    userName?: string | null;
    department?: string | null;
    requestCount: number;
    blockedCount: number;
    bytes: number;
    downloadBytes?: number;
    uploadBytes?: number;
    percentage: number;
  }>;
  onSelectIp?: (ip: string) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
  correlatedIp?: string | null;
  onHoverIp?: (ip: string | null) => void;
}

export function TopClientsTable({
  clients,
  onSelectIp,
  onEditAlias,
  onViewProfile,
  correlatedIp,
  onHoverIp,
}: TopClientsTableProps) {
  const isPrivacyMode = usePrivacyMode();
  const handleExportCsv = () => {
    exportToCsv('top_squid_clients', clients, [
      { key: 'clientIp', header: 'Client IP' },
      { key: 'userName', header: 'User Name' },
      { key: 'department', header: 'Department' },
      { key: 'requestCount', header: 'Requests' },
      { key: 'blockedCount', header: 'Blocked Count' },
      { key: 'downloadBytes', header: 'Download Bytes' },
      { key: 'uploadBytes', header: 'Upload Bytes' },
      { key: 'bytes', header: 'Total Bytes' },
      { key: 'percentage', header: 'Share (%)' },
    ]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-400" />
            Top Client IPs &amp; Bandwidth
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal workstations on nipponbpo.local with separated download &amp; upload volumes
          </p>
        </div>

        {clients.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export top clients to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        {clients.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No client records found.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[620px]">
            <caption className="sr-only">Top Client IPs and Bandwidth Transfer</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 font-semibold">
                <th scope="col" className="pb-2.5 pl-1 min-w-[170px]">Employee / Client Host</th>
                <th scope="col" className="pb-2.5 text-right text-emerald-400 hidden lg:table-cell min-w-[85px]">Download ⬇</th>
                <th scope="col" className="pb-2.5 text-right text-purple-400 hidden lg:table-cell min-w-[85px]">Upload ⬆</th>
                <th scope="col" className="pb-2.5 text-right text-blue-300 min-w-[80px]">Volume</th>
                <th scope="col" className="pb-2.5 text-right min-w-[60px]">Reqs</th>
                <th scope="col" className="pb-2.5 text-right min-w-[65px]">Blocked</th>
                <th scope="col" className="pb-2.5 pl-3 w-28 min-w-[100px]">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {clients.map((item, idx) => {
                const dl = item.downloadBytes ?? Math.round(item.bytes * 0.85);
                const ul = item.uploadBytes ?? Math.max(0, item.bytes - dl);
                const isCorrelated = Boolean(correlatedIp && correlatedIp === item.clientIp);
                return (
                  <tr
                    key={idx}
                    onMouseEnter={() => onHoverIp?.(item.clientIp)}
                    onMouseLeave={() => onHoverIp?.(null)}
                    className={`transition-colors group ${
                      isCorrelated ? 'bg-indigo-950/70 ring-2 ring-indigo-400' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 pl-1">
                      <div>
                        {item.userName ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => (onViewProfile ? onViewProfile(item.clientIp) : onSelectIp?.(item.clientIp))}
                              className="font-semibold text-slate-100 hover:text-amber-300 hover:underline cursor-pointer truncate max-w-[140px]"
                            >
                              {maskEmployeeName(item.userName, isPrivacyMode)}
                            </button>
                            {item.department && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {item.department}
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => (onViewProfile ? onViewProfile(item.clientIp) : onSelectIp?.(item.clientIp))}
                            title={`Inspect Dossier for ${item.clientIp}`}
                            className="font-mono text-[11px] font-medium text-amber-300 hover:text-amber-200 hover:underline cursor-pointer"
                          >
                            {item.clientIp}
                          </button>
                          {!item.userName && onEditAlias && (
                            <button
                              type="button"
                              onClick={() => onEditAlias(item.clientIp)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-sans font-medium transition-colors cursor-pointer shadow-xs"
                              title="Assign alias or employee name to this host"
                            >
                              + Name this host
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-emerald-400 hidden lg:table-cell">
                      {formatBytes(dl)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-purple-400 hidden lg:table-cell">
                      {formatBytes(ul)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-blue-300">
                      {formatBytes(item.bytes)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-200">
                      {formatNumber(item.requestCount)}
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      {item.blockedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          {formatNumber(item.blockedCount)}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden min-w-[50px]">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right font-mono tabular-nums">
                          {item.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
