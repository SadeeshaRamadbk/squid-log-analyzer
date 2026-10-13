'use client';

import React from 'react';
import { Calendar, Filter, X, RefreshCw, Server, Clock, Radio, Network, Tag } from 'lucide-react';

interface SoftflowdFiltersProps {
  startDate?: string;
  endDate?: string;
  srcIp?: string;
  dstIp?: string;
  protocol?: string;
  serviceName?: string;
  timeWindow?: '30m' | '1h';
  availableClientIps: Array<string | { clientIp: string; userName?: string | null; department?: string | null }>;
  availableProtocols: string[];
  availableServices: string[];
  minDate: string | null;
  maxDate: string | null;
  onFilterChange: (filters: {
    startDate?: string;
    endDate?: string;
    srcIp?: string;
    dstIp?: string;
    protocol?: string;
    serviceName?: string;
    timeWindow?: '30m' | '1h';
  }) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isRealTime: boolean;
  onToggleRealTime: () => void;
}

export function SoftflowdFilters({
  startDate,
  endDate,
  srcIp,
  dstIp,
  protocol,
  serviceName,
  timeWindow,
  availableClientIps,
  availableProtocols,
  availableServices,
  minDate,
  maxDate,
  onFilterChange,
  onRefresh,
  isRefreshing,
  isRealTime,
  onToggleRealTime,
}: SoftflowdFiltersProps) {
  const handlePreset = (preset: '30m' | '1h' | 'today' | '7d' | '30d' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === '30m') {
      onFilterChange({ startDate: undefined, endDate: undefined, srcIp, dstIp, protocol, serviceName, timeWindow: '30m' });
    } else if (preset === '1h') {
      onFilterChange({ startDate: undefined, endDate: undefined, srcIp, dstIp, protocol, serviceName, timeWindow: '1h' });
    } else if (preset === 'all') {
      onFilterChange({ startDate: undefined, endDate: undefined, srcIp, dstIp, protocol, serviceName, timeWindow: undefined });
    } else if (preset === 'today') {
      onFilterChange({ startDate: todayStr, endDate: todayStr, srcIp, dstIp, protocol, serviceName, timeWindow: undefined });
    } else if (preset === '7d') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr, srcIp, dstIp, protocol, serviceName, timeWindow: undefined });
    } else if (preset === '30d') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr, srcIp, dstIp, protocol, serviceName, timeWindow: undefined });
    }
  };

  const hasActiveFilters = Boolean(startDate || endDate || srcIp || dstIp || protocol || serviceName || timeWindow);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-md space-y-3">
      {/* Top Row: Presets & Live Polling */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Flow Time:
          </span>

          <button
            type="button"
            onClick={() => handlePreset('30m')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              timeWindow === '30m'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 border border-emerald-400/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            Last 30 Min
          </button>

          <button
            type="button"
            onClick={() => handlePreset('1h')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              timeWindow === '1h'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Last 1 Hour
          </button>

          <button
            type="button"
            onClick={() => handlePreset('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              !timeWindow && startDate === new Date().toISOString().split('T')[0] && endDate === startDate
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => handlePreset('7d')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            Last 7 Days
          </button>

          <button
            type="button"
            onClick={() => handlePreset('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              !startDate && !endDate && !timeWindow
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Recorded
          </button>
        </div>

        {/* Live radar & refresh */}
        <div className="flex items-center gap-2">
          {/* Animated Real-Time Live Toggle */}
          <button
            type="button"
            onClick={onToggleRealTime}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRealTime
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title={isRealTime ? 'Real-Time streaming active (click to pause)' : 'Click to enable 3s live polling'}
          >
            {isRealTime ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wide">REAL TIME (3s)</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                <span>Real-Time</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Bottom Row: Detailed Selectors (Source IP, Protocol, Service, Custom Dates) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
        {/* Source IP / Host */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
          <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <select
            value={srcIp || ''}
            onChange={(e) =>
              onFilterChange({
                startDate,
                endDate,
                srcIp: e.target.value || undefined,
                dstIp,
                protocol,
                serviceName,
                timeWindow,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-2 max-w-[200px] truncate"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Internal Source IPs
            </option>
            {availableClientIps.map((item) => {
              const ip = typeof item === 'string' ? item : item.clientIp;
              const user = typeof item === 'object' && item.userName ? item.userName : null;
              const dept = typeof item === 'object' && item.department ? ` (${item.department})` : '';
              const label = user ? `${ip} - ${user}${dept}` : ip;
              return (
                <option key={ip} value={ip} className="bg-slate-900 text-slate-200">
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Protocol Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
          <Network className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <select
            value={protocol || ''}
            onChange={(e) =>
              onFilterChange({
                startDate,
                endDate,
                srcIp,
                dstIp,
                protocol: e.target.value || undefined,
                serviceName,
                timeWindow,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-2"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Protocols
            </option>
            {['TCP', 'UDP', 'ICMP', 'GRE', 'ESP'].map((p) => (
              <option key={p} value={p} className="bg-slate-900 text-slate-200">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Service / Port Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
          <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <select
            value={serviceName || ''}
            onChange={(e) =>
              onFilterChange({
                startDate,
                endDate,
                srcIp,
                dstIp,
                protocol,
                serviceName: e.target.value || undefined,
                timeWindow,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-2 max-w-[150px] truncate"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Services / Ports
            </option>
            {availableServices.length > 0
              ? availableServices.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-200">
                    {s}
                  </option>
                ))
              : ['HTTPS', 'DNS', 'HTTP', 'SSH', 'RDP', 'SMB'].map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-200">
                    {s}
                  </option>
                ))}
          </select>
        </div>

        {/* Custom Date Range */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
          <input
            type="date"
            value={startDate || ''}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) =>
              onFilterChange({
                startDate: e.target.value || undefined,
                endDate,
                srcIp,
                dstIp,
                protocol,
                serviceName,
                timeWindow: undefined,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={endDate || ''}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) =>
              onFilterChange({
                startDate,
                endDate: e.target.value || undefined,
                srcIp,
                dstIp,
                protocol,
                serviceName,
                timeWindow: undefined,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                startDate: undefined,
                endDate: undefined,
                srcIp: undefined,
                dstIp: undefined,
                protocol: undefined,
                serviceName: undefined,
                timeWindow: undefined,
              })
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer ml-auto"
            title="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
