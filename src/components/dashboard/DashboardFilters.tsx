'use client';

import React from 'react';
import { Calendar, Filter, X, RefreshCw, Server, Clock, Radio, Layers } from 'lucide-react';
import { DateRangeSelector } from '../common/DateRangeSelector';

interface DashboardFiltersProps {
  startDate?: string;
  endDate?: string;
  clientIp?: string;
  timeWindow?: '30m' | '1h';
  availableClientIps: Array<string | { clientIp: string; userName?: string | null; department?: string | null }>;
  minDate: string | null;
  maxDate: string | null;
  onFilterChange: (filters: { startDate?: string; endDate?: string; clientIp?: string; timeWindow?: '30m' | '1h' }) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isRealTime: boolean;
  onToggleRealTime: () => void;
  onOpenSquidFeed?: () => void;
  onOpenNetflowFeed?: () => void;
}

export function DashboardFilters({
  startDate,
  endDate,
  clientIp,
  timeWindow,
  availableClientIps,
  minDate,
  maxDate,
  onFilterChange,
  onRefresh,
  isRefreshing,
  isRealTime,
  onToggleRealTime,
  onOpenSquidFeed,
  onOpenNetflowFeed,
}: DashboardFiltersProps) {
  // Preset handler
  const handlePreset = (preset: '30m' | '1h' | 'today' | '7d' | '30d' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === '30m') {
      onFilterChange({ startDate: undefined, endDate: undefined, clientIp, timeWindow: '30m' });
    } else if (preset === '1h') {
      onFilterChange({ startDate: undefined, endDate: undefined, clientIp, timeWindow: '1h' });
    } else if (preset === 'all') {
      onFilterChange({ startDate: undefined, endDate: undefined, clientIp, timeWindow: undefined });
    } else if (preset === 'today') {
      onFilterChange({ startDate: todayStr, endDate: todayStr, clientIp, timeWindow: undefined });
    } else if (preset === '7d') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr, clientIp, timeWindow: undefined });
    } else if (preset === '30d') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr, clientIp, timeWindow: undefined });
    }
  };

  const hasActiveFilters = Boolean(startDate || endDate || clientIp || timeWindow);

  return (
    <div className="relative z-20 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Quick Date & Time Window Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Time Range:
          </span>

          {/* 30 Minutes Filter */}
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

          {/* 1 Hour Filter */}
          <button
            type="button"
            onClick={() => handlePreset('1h')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              timeWindow === '1h'
                ? 'bg-blue-600 text-white'
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
                ? 'bg-blue-600 text-white'
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
            onClick={() => handlePreset('30d')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            Last 30 Days
          </button>

          <button
            type="button"
            onClick={() => handlePreset('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              !startDate && !endDate && !timeWindow
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Recorded
          </button>
        </div>

        {/* Right: Custom Date range + Client IP dropdown + Real-Time Toggle & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom Date Pickers */}
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            minDate={minDate || undefined}
            maxDate={maxDate || undefined}
            onChange={({ startDate: s, endDate: e }) =>
              onFilterChange({
                startDate: s,
                endDate: e,
                clientIp,
                timeWindow: undefined,
              })
            }
          />

          {/* Client IP Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1">
            <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={clientIp || ''}
              onChange={(e) =>
                onFilterChange({
                  startDate,
                  endDate,
                  clientIp: e.target.value || undefined,
                  timeWindow,
                })
              }
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-2 max-w-[210px] truncate"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Client IPs (nipponbpo.local)
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

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  startDate: undefined,
                  endDate: undefined,
                  clientIp: undefined,
                  timeWindow: undefined,
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Animated Real-Time Live Toggle Button */}
          <button
            type="button"
            onClick={onToggleRealTime}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRealTime
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title={isRealTime ? 'Real-Time streaming active (click to pause)' : 'Click to enable live real-time auto updates'}
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            Refresh
          </button>

          {/* Dedicated Live Feed Details Popups */}
          {(onOpenSquidFeed || onOpenNetflowFeed) && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
              {onOpenSquidFeed && (
                <button
                  type="button"
                  onClick={onOpenSquidFeed}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                  title="Open Squid Proxy Live Feed popup with complete logs & deep filters"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Squid Live Feed</span>
                </button>
              )}
              {onOpenNetflowFeed && (
                <button
                  type="button"
                  onClick={onOpenNetflowFeed}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
                  title="Open pfSense NetFlow Live Feed popup with session telemetry & socket filters"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>NetFlow Live Feed</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
