'use client';

import React from 'react';
import { Server, User, Tag, UserCheck } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';

interface TopTalkersTableProps {
  talkers: Array<{
    srcIp: string;
    userName?: string | null;
    department?: string | null;
    flowCount: number;
    bytes: number;
    downloadBytes?: number;
    uploadBytes?: number;
    packets: number;
    percentage: number;
  }>;
  onSelectIp?: (ip: string) => void;
  onEditAlias?: (ip: string) => void;
  onViewProfile?: (ip: string) => void;
}

export function TopTalkersTable({
  talkers,
  onSelectIp,
  onEditAlias,
  onViewProfile,
}: TopTalkersTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            Top Talkers (Internal Hosts &amp; Users)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal hosts broken down by Download, Upload, and Total Volume
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {talkers.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No source host traffic recorded.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Host / User</th>
                <th className="pb-2.5 text-right text-emerald-400">Download ⬇</th>
                <th className="pb-2.5 text-right text-purple-400">Upload ⬆</th>
                <th className="pb-2.5 text-right text-blue-300">Total</th>
                <th className="pb-2.5 text-right">Flows</th>
                <th className="pb-2.5 pl-4 w-24">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {talkers.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-2.5 pl-1">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => (onViewProfile ? onViewProfile(item.srcIp) : onSelectIp?.(item.srcIp))}
                            title={`Inspect Dossier for ${item.srcIp}`}
                            className="font-mono font-medium text-indigo-300 hover:text-indigo-200 hover:underline cursor-pointer"
                          >
                            {item.srcIp}
                          </button>
                          {item.userName ? (
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(item.srcIp)}
                              className="text-[11px] font-medium text-slate-200 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                              title="View IP Profile Dossier"
                            >
                              &bull; <User className="w-3 h-3 text-indigo-400" /> {item.userName}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditAlias?.(item.srcIp)}
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
                            onClick={() => onViewProfile(item.srcIp)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                            title="Inspect IP Dossier Profile"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditAlias?.(item.srcIp)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                          title="Edit IP User Mapping"
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-emerald-400">
                    {formatBytes(item.downloadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-purple-400">
                    {formatBytes(item.uploadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-100 font-mono">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 font-mono">
                    {formatNumber(item.flowCount)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-mono">
                        {item.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
