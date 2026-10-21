'use client';

import React from 'react';
import { Tag, Download } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import { exportToCsv } from '@/lib/exportCsv';

interface TopServicesTableProps {
  services: Array<{
    dstPort: number;
    serviceName: string;
    protocol: string;
    flowCount: number;
    bytes: number;
    percentage: number;
  }>;
  onSelectService?: (serviceName: string) => void;
  onViewPort?: (port: number, protocol?: string) => void;
}

export function TopServicesTable({
  services,
  onSelectService,
  onViewPort,
}: TopServicesTableProps) {
  const handleExportCsv = () => {
    exportToCsv('top_services_ports', services, [
      { key: 'serviceName', header: 'Service Name' },
      { key: 'dstPort', header: 'Port' },
      { key: 'protocol', header: 'Protocol' },
      { key: 'flowCount', header: 'Flow Count' },
      { key: 'bytes', header: 'Bytes' },
      { key: 'percentage', header: 'Share (%)' },
    ]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Top Application Services & Ports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            L4 port and protocol classification of network flows
          </p>
        </div>

        {services.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export top services to CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        {services.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            No service traffic recorded.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[500px]">
            <caption className="sr-only">Top Application Services and Port Distribution</caption>
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 font-semibold bg-slate-950/40">
                <th scope="col" className="pb-2.5 pl-2">Service / Port</th>
                <th scope="col" className="pb-2.5 w-16">Proto</th>
                <th scope="col" className="pb-2.5 pr-2 text-right">Volume</th>
                <th scope="col" className="pb-2.5 pr-2 text-right">Flows</th>
                <th scope="col" className="pb-2.5 pl-4 pr-2 w-28">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {services.map((item, idx) => (
                <tr
                  key={idx}
                  className="even:bg-slate-950/30 odd:bg-slate-900/10 hover:bg-slate-800/60 transition-colors"
                >
                  <td className="py-2.5 pl-2 font-medium text-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        onViewPort ? onViewPort(item.dstPort, item.protocol) : onSelectService?.(item.serviceName)
                      }
                      className="hover:text-purple-300 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                      title={`Inspect Port ${item.dstPort}`}
                    >
                      <span className="font-semibold text-purple-300">{item.serviceName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.dstPort})</span>
                    </button>
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 font-mono">
                      {item.protocol}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 text-right font-semibold text-slate-100 font-mono tabular-nums">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-slate-300 font-mono tabular-nums">
                    {formatNumber(item.flowCount)}
                  </td>
                  <td className="py-2.5 pl-4 pr-2">
                    <div className="flex items-center gap-2 min-w-[50px]">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-mono tabular-nums">
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
