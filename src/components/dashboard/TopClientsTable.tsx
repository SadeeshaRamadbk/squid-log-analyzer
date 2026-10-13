'use client';

import React from 'react';
import { Monitor, ShieldAlert, User, Tag, UserCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

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
}

export function TopClientsTable({
  clients,
  onSelectIp,
  onEditAlias,
  onViewProfile,
}: TopClientsTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-400" />
            Top Client IPs &amp; Bandwidth
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal hosts on nipponbpo.local with separated download &amp; upload volumes
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {clients.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No client records found.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Client IP / User</th>
                <th className="pb-2.5 text-right text-emerald-400">Download ⬇</th>
                <th className="pb-2.5 text-right text-purple-400">Upload ⬆</th>
                <th className="pb-2.5 text-right text-blue-300">Total</th>
                <th className="pb-2.5 text-right">Requests</th>
                <th className="pb-2.5 text-right">Blocked</th>
                <th className="pb-2.5 pl-4 w-24">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {clients.map((item, idx) => {
                const dl = item.downloadBytes ?? Math.round(item.bytes * 0.85);
                const ul = item.uploadBytes ?? Math.max(0, item.bytes - dl);
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-2.5 pl-1">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => (onViewProfile ? onViewProfile(item.clientIp) : onSelectIp?.(item.clientIp))}
                              title={`Inspect Dossier for ${item.clientIp}`}
                              className="font-mono font-medium text-amber-300 hover:text-amber-200 hover:underline cursor-pointer"
                            >
                              {item.clientIp}
                            </button>
                            {item.userName ? (
                              <button
                                type="button"
                                onClick={() => onViewProfile?.(item.clientIp)}
                                className="text-[11px] font-medium text-slate-200 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                                title="View IP Profile Dossier"
                              >
                                &bull; <User className="w-3 h-3 text-indigo-400" /> {item.userName}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEditAlias?.(item.clientIp)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-400/80 hover:text-amber-300 hover:underline inline-flex items-center gap-0.5"
                              >
                                + Name
                              </button>
                            )}
                          </div>
                          {item.department && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.department}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          {onViewProfile && (
                            <button
                              type="button"
                              onClick={() => onViewProfile(item.clientIp)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                              title="Inspect IP Dossier Profile"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditAlias?.(item.clientIp)}
                            className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                            title="Edit IP User Mapping"
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-emerald-400">
                      {formatBytes(dl)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-purple-400">
                      {formatBytes(ul)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-200">
                      {formatBytes(item.bytes)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-300">
                      {formatNumber(item.requestCount)}
                    </td>
                    <td className="py-2.5 text-right">
                      {item.blockedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <ShieldAlert className="w-3 h-3" />
                          {formatNumber(item.blockedCount)}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-8 text-right font-mono">
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
