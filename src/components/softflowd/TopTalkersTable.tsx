'use client';

import React from 'react';
import { Server, Download } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';
import { maskEmployeeName } from '@/lib/privacy';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

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
  const isPrivacyMode = usePrivacyMode();
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
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/90 border-t-white/10 rounded-xl p-5 shadow-lg flex flex-col h-full">
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
            <caption className="sr-only">Top Talkers and Host Bandwidth Breakdown</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 font-semibold">
                <th scope="col" className="pb-2.5 pl-1 min-w-[170px]">Host / Employee</th>
                <th scope="col" className="pb-2.5 text-right text-emerald-400 hidden lg:table-cell min-w-[85px]">Download ⬇</th>
                <th scope="col" className="pb-2.5 text-right text-purple-400 hidden lg:table-cell min-w-[85px]">Upload ⬆</th>
                <th scope="col" className="pb-2.5 text-right text-blue-300 min-w-[80px]">Volume</th>
                <th scope="col" className="pb-2.5 text-right min-w-[60px]">Flows</th>
                <th scope="col" className="pb-2.5 pl-3 w-28 min-w-[100px]">Share</th>
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
                    className={`transition-colors group even:bg-slate-950/30 odd:bg-slate-900/10 ${
                      isCorrelated ? 'bg-indigo-950/70 ring-2 ring-indigo-400' : 'hover:bg-slate-800/60'
                    }`}
                  >
                  <td className="py-2.5 pl-1">
                    <div>
                      {item.userName ? (
                        <div className="flex items-center gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => (onViewProfile ? onViewProfile(item.srcIp) : onSelectIp?.(item.srcIp))}
                            className="inline-flex items-center min-h-[24px] font-semibold text-slate-100 hover:text-indigo-300 hover:underline cursor-pointer truncate max-w-[140px]"
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
                          onClick={() => (onViewProfile ? onViewProfile(item.srcIp) : onSelectIp?.(item.srcIp))}
                          title={`Inspect Dossier for ${item.srcIp}`}
                          className="inline-flex items-center min-h-[24px] font-mono text-[11px] font-medium text-indigo-300 hover:text-indigo-200 hover:underline cursor-pointer"
                        >
                          {item.srcIp}
                        </button>
                        {!item.userName && onEditAlias && (
                          <button
                            type="button"
                            onClick={() => onEditAlias(item.srcIp)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-sans font-medium transition-colors cursor-pointer shadow-xs"
                            title="Assign alias or employee name to this host"
                          >
                            + Name this host
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400 hidden lg:table-cell">
                    {formatBytes(item.downloadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-purple-400 hidden lg:table-cell">
                    {formatBytes(item.uploadBytes ?? 0)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-blue-300">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-200">
                    {formatNumber(item.flowCount)}
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden min-w-[50px]">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
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
