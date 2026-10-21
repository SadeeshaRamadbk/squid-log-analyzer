'use client';

import React, { useState } from 'react';
import {
  Terminal,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Copy,
  Check,
  HardDrive,
  ShieldAlert,
} from 'lucide-react';
import type { SyslogEventRow } from '@/lib/db/syslog-queries';

interface SyslogTableProps {
  events: SyslogEventRow[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function SyslogTable({
  events,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: SyslogTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<SyslogEventRow | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyRaw = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (severity: number, label: string) => {
    switch (severity) {
      case 0:
      case 1:
      case 2:
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />
            {label}
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            {label}
          </span>
        );
      case 5:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {label}
          </span>
        );
      case 6:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
            {label}
          </span>
        );
    }
  };

  const getAppBadge = (appName: string) => {
    const name = appName.toLowerCase();
    if (name.includes('squid')) {
      return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
    }
    if (name.includes('filterlog')) {
      return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
    }
    if (name.includes('dpinger')) {
      return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
    }
    if (name.includes('dhcp')) {
      return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
    }
    if (name.includes('openvpn') || name.includes('ssh')) {
      return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
    }
    return 'bg-slate-800/80 text-slate-300 border-slate-700';
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Header Controls */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Live Syslog Event Stream
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            ({total.toLocaleString()} total events)
          </span>
        </div>

        {/* Pagination Status */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/40">
              <th className="py-2.5 px-3 w-40 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 w-28 font-semibold">Severity</th>
              <th className="py-2.5 px-3 w-32 font-semibold">Service</th>
              <th className="py-2.5 px-3 w-36 font-semibold">Source Host</th>
              <th className="py-2.5 px-3 font-semibold">Message Body</th>
              <th className="py-2.5 px-3 w-16 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                  {isLoading ? 'Loading syslog stream...' : 'No syslog events match the selected criteria.'}
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const isErr = event.severity <= 3;
                const isWarn = event.severity === 4;

                return (
                  <tr
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                      isErr
                        ? 'bg-rose-950/10'
                        : isWarn
                        ? 'bg-amber-950/10'
                        : ''
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </td>

                    {/* Severity & Action Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(event.severity, event.severity_label)}
                        {event.action && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${
                              event.action === 'block' || event.action === 'reject'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {event.action}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Service/App Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getAppBadge(
                          event.app_name
                        )}`}
                      >
                        {event.app_name}
                        {event.proc_id ? `[${event.proc_id}]` : ''}
                      </span>
                    </td>

                    {/* Hostname */}
                    <td className="py-2 px-3 text-[11px] text-slate-300 truncate max-w-[140px]" title={event.hostname}>
                      {event.hostname}
                    </td>

                    {/* Message Body */}
                    <td className="py-2 px-3 text-[11px] text-slate-200 break-all max-w-xl group-hover:text-white">
                      <span className={isErr ? 'text-rose-300 font-medium' : isWarn ? 'text-amber-300' : ''}>
                        {event.message}
                      </span>
                    </td>

                    {/* View Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Inspect full raw event"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Event Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Syslog Event Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-sans">
              {/* Key metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Severity</span>
                  <div className="mt-1">{getSeverityBadge(selectedEvent.severity, selectedEvent.severity_label)}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Facility</span>
                  <span className="font-mono text-cyan-300 font-medium block mt-1">
                    {selectedEvent.facility_label} ({selectedEvent.facility})
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Service App</span>
                  <span className="font-mono text-indigo-300 font-medium block mt-1">
                    {selectedEvent.app_name}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Process ID</span>
                  <span className="font-mono text-slate-300 font-medium block mt-1">
                    {selectedEvent.proc_id || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Timestamp & Hostname */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Source Host: </span>
                  <span className="text-slate-200 font-medium">{selectedEvent.hostname}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp: </span>
                  <span className="text-slate-200">{new Date(selectedEvent.timestamp).toISOString()}</span>
                </div>
              </div>

              {/* Structured Firewall Details if filterlog */}
              {selectedEvent.action && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Structured pfSense Firewall Packet
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Action</span>
                      <span className={selectedEvent.action === 'block' ? 'text-rose-400 font-bold uppercase' : 'text-emerald-400 font-bold uppercase'}>
                        {selectedEvent.action} ({selectedEvent.direction || 'in'})
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Interface</span>
                      <span className="text-cyan-300 font-medium">{selectedEvent.interface || 'unknown'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Protocol</span>
                      <span className="text-purple-300 font-medium">{selectedEvent.protocol || 'IP'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">TCP Flags</span>
                      <span className="text-amber-300 font-medium">{selectedEvent.tcp_flags || '-'}</span>
                    </div>
                  </div>
                  {(selectedEvent.src_ip || selectedEvent.dst_ip) && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Source</span>
                        <span className="text-indigo-300">{selectedEvent.src_ip}{selectedEvent.src_port ? `:${selectedEvent.src_port}` : ''}</span>
                      </div>
                      <span className="text-slate-600 font-bold">→</span>
                      <div>
                        <span className="text-slate-500 text-[10px] block text-right">Destination</span>
                        <span className="text-cyan-300">{selectedEvent.dst_ip}{selectedEvent.dst_port ? `:${selectedEvent.dst_port}` : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Payload */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Parsed Message Payload
                </span>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 break-all whitespace-pre-wrap leading-relaxed">
                  {selectedEvent.message}
                </div>
              </div>

              {/* Raw Message */}
              {selectedEvent.raw_message && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Raw Syslog Datagram
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRaw(selectedEvent.raw_message)}
                      className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 break-all leading-tight">
                    {selectedEvent.raw_message}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
