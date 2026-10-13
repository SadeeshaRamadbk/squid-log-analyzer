'use client';

import React from 'react';
import { Server, User, Tag, Download } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';

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
  correlatedIp?: string | null;
  onHoverIp?: (ip: string | null) => void;
}

export function TopTalkersTable({
  talkers,
  onSelectIp,
  onEditAlias,
  onViewProfile,
  correlatedIp,
  onHoverIp,
}: TopTalkersTableProps) {
  const handleExportCsv = () => {
    exportToCsv('top_softflowd_talkers', talkers, [
      { key: 'srcIp', header: 'Source IP' },
      { key: 'userName', header: 'User Name' },
      { key: 'department', header: 'Department' },
      { key: 'flowCount', header: 'Flow Count' },
      { key: 'downloadBytes', header: 'Download Bytes' },
      { key: 'uploadBytes', header: 'Upload Bytes' },
      { key: 'bytes', header: 'Total Bytes' },
      { key: 'packets', header: 'Packets' },
      { key: 'percentage', header: 'Share (%)' },
    ]);
  };

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

        {talkers.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export top talkers to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        {talkers.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No source host traffic recorded.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-1">Host / Employee</th>
                <th className="pb-2.5 text-right text-emerald-400">Download ⬇</th>
                <th className="pb-2.5 text-right text-purple-400">Upload ⬆</th>
                <th className="pb-2.5 text-right text-blue-300">Total</th>
                <th className="pb-2.5 text-right">Flows</th>
                <th className="pb-2.5 pl-4 w-24">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {talkers.map((item, idx) => {
                const isCorrelated = Boolean(correlatedIp && correlatedIp === item.srcIp);
                return (
                  <tr
                    key={idx}
                    onMouseEnter={() => onHoverIp?.(item.srcIp)}
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
                            onClick={() => (onViewProfile ? onViewProfile(item.srcIp) : onSelectIp?.(item.srcIp))}
                            className="font-semibold text-slate-100 hover:text-indigo-300 hover:underline cursor-pointer truncate max-w-[140px]"
                          >
                            {item.userName}
                          </button>
                          {item.department && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.department}
                            </span>
                          )}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => (onViewProfile ? onViewProfile(item.srcIp) : onSelectIp?.(item.srcIp))}
                          title={`Inspect Dossier for ${item.srcIp}`}
                          className="font-mono text-[11px] font-medium text-indigo-300 hover:text-indigo-200 hover:underline cursor-pointer"
                        >
                          {item.srcIp}
                        </button>
                        {!item.userName && onEditAlias && (
                          <button
                            type="button"
                            onClick={() => onEditAlias(item.srcIp)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 cursor-pointer"
                            title="Assign User Name to this IP"
                          >
                            + Name
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-emerald-400">
                    {formatBytes(item.downloadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-purple-400">
                    {formatBytes(item.uploadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-blue-300">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-200">
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
