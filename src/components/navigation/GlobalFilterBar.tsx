'use client';

import React from 'react';
import { Clock, Radio, RefreshCw, X, Filter, Link2, Shield, Network, Server, Tag } from 'lucide-react';

export interface GlobalFilterState {
  timeWindow?: '30m' | '1h';
  startDate?: string;
  endDate?: string;
  clientIp?: string;
  protocol?: string;
  serviceName?: string;
  trafficType?: 'all' | 'external' | 'internal';
  hideFirewallTraffic?: boolean;
  hideProxyHop?: boolean;
}

interface GlobalFilterBarProps {
  filters: GlobalFilterState;
  onFilterChange: (filters: GlobalFilterState) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isRealTime: boolean;
  onToggleRealTime: () => void;
  isFilterSynced?: boolean;
  onToggleFilterSync?: () => void;
  availableClientIps?: Array<string | { clientIp: string; userName?: string | null; department?: string | null }>;
  availableProtocols?: string[];
  availableServices?: string[];
  activeView: 'squid' | 'softflowd' | 'split';
}

export function GlobalFilterBar({
  filters,
  onFilterChange,
  onRefresh,
  isRefreshing,
  isRealTime,
  onToggleRealTime,
  isFilterSynced,
  onToggleFilterSync,
  availableClientIps = [],
  availableProtocols = ['TCP', 'UDP', 'ICMP'],
  availableServices = ['HTTPS', 'DNS', 'HTTP', 'SSH', 'RDP', 'SMB'],
  activeView,
}: GlobalFilterBarProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const handleTimePreset = (preset: '30m' | '1h' | 'today' | '7d' | '30d' | 'all') => {
    const next = { ...filters };
    if (preset === '30m') {
      next.timeWindow = '30m';
      next.startDate = undefined;
      next.endDate = undefined;
    } else if (preset === '1h') {
      next.timeWindow = '1h';
      next.startDate = undefined;
      next.endDate = undefined;
    } else if (preset === 'today') {
      next.timeWindow = undefined;
      next.startDate = todayStr;
      next.endDate = todayStr;
    } else if (preset === '7d') {
      next.timeWindow = undefined;
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      next.startDate = past;
      next.endDate = todayStr;
    } else if (preset === '30d') {
      next.timeWindow = undefined;
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      next.startDate = past;
      next.endDate = todayStr;
    } else if (preset === 'all') {
      next.timeWindow = undefined;
      next.startDate = undefined;
      next.endDate = undefined;
    }
    onFilterChange(next);
  };

  // Build active filter chips list
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.timeWindow === '30m') {
    chips.push({
      key: 'time-30m',
      label: 'Window: Last 30 Min',
      onRemove: () => onFilterChange({ ...filters, timeWindow: undefined }),
    });
  } else if (filters.timeWindow === '1h') {
    chips.push({
      key: 'time-1h',
      label: 'Window: Last 1 Hour',
      onRemove: () => onFilterChange({ ...filters, timeWindow: undefined }),
    });
  } else if (filters.startDate || filters.endDate) {
    const label =
      filters.startDate === filters.endDate
        ? `Date: ${filters.startDate}`
        : `Range: ${filters.startDate || 'start'} to ${filters.endDate || 'now'}`;
    chips.push({
      key: 'date-range',
      label,
      onRemove: () => onFilterChange({ ...filters, startDate: undefined, endDate: undefined }),
    });
  }

  if (filters.clientIp) {
    const match = availableClientIps.find(
      (item) => (typeof item === 'string' ? item : item.clientIp) === filters.clientIp
    );
    const userLabel =
      match && typeof match === 'object' && match.userName
        ? `${filters.clientIp} (${match.userName})`
        : filters.clientIp;
    chips.push({
      key: 'ip',
      label: `Host: ${userLabel}`,
      onRemove: () => onFilterChange({ ...filters, clientIp: undefined }),
    });
  }

  if (filters.protocol) {
    chips.push({
      key: 'protocol',
      label: `Proto: ${filters.protocol}`,
      onRemove: () => onFilterChange({ ...filters, protocol: undefined }),
    });
  }

  if (filters.serviceName) {
    chips.push({
      key: 'service',
      label: `Service: ${filters.serviceName}`,
      onRemove: () => onFilterChange({ ...filters, serviceName: undefined }),
    });
  }

  const hasAnyFilter = chips.length > 0;

  const handleClearAll = () => {
    onFilterChange({
      timeWindow: undefined,
      startDate: undefined,
      endDate: undefined,
      clientIp: undefined,
      protocol: undefined,
      serviceName: undefined,
      trafficType: 'all',
      hideFirewallTraffic: true,
      hideProxyHop: true,
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm backdrop-blur-md space-y-2.5">
      {/* Top: Presets & Live Streaming */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Time:
          </span>

          <button
            type="button"
            onClick={() => handleTimePreset('30m')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              filters.timeWindow === '30m'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            30 Min
          </button>

          <button
            type="button"
            onClick={() => handleTimePreset('1h')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filters.timeWindow === '1h'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            1 Hour
          </button>

          <button
            type="button"
            onClick={() => handleTimePreset('today')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              !filters.timeWindow && filters.startDate === todayStr && filters.endDate === todayStr
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => handleTimePreset('7d')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            7 Days
          </button>

          <button
            type="button"
            onClick={() => handleTimePreset('30d')}
            className="px-2.5 py-1 rounded-md font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            30 Days
          </button>

          <button
            type="button"
            onClick={() => handleTimePreset('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              !filters.timeWindow && !filters.startDate && !filters.endDate
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Time
          </button>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-0.5 ml-1">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  startDate: e.target.value || undefined,
                  timeWindow: undefined,
                })
              }
              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
            />
            <span className="text-slate-500 text-[10px]">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  endDate: e.target.value || undefined,
                  timeWindow: undefined,
                })
              }
              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Live radar & Refresh */}
        <div className="flex items-center gap-2">
          {onToggleFilterSync && (
            <button
              type="button"
              onClick={onToggleFilterSync}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium cursor-pointer ${
                isFilterSynced
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Sync filters across both panels"
            >
              <Link2 className="w-3 h-3" />
              <span>{isFilterSynced ? 'Synced' : 'Sync'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleRealTime}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRealTime
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title={isRealTime ? 'Live 3s polling active' : 'Turn on live streaming'}
          >
            {isRealTime ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>REAL TIME (3s)</span>
              </>
            ) : (
              <>
                <Radio className="w-3 h-3 text-slate-400" />
                <span>Real-Time</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-indigo-400" /> Active Filters:
          </span>

          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium animate-in fade-in zoom-in-95 duration-100"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors cursor-pointer text-indigo-200 hover:text-white"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-slate-400 hover:text-rose-300 underline transition-colors cursor-pointer ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
