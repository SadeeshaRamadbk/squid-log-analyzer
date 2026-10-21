'use client';

import React from 'react';
import { Search, RefreshCw, Radio, Filter, Calendar, X } from 'lucide-react';

interface SyslogFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  severityLevel: 'all' | 'errors' | 'warnings' | 'notices' | 'info';
  onSeverityChange: (level: 'all' | 'errors' | 'warnings' | 'notices' | 'info') => void;
  actionFilter?: 'all' | 'block' | 'pass';
  onActionChange?: (action: 'all' | 'block' | 'pass') => void;
  selectedApp: string;
  onAppChange: (app: string) => void;
  availableApps: string[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  isRealtime: boolean;
  onToggleRealtime: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function SyslogFilters({
  search,
  onSearchChange,
  severityLevel,
  onSeverityChange,
  actionFilter = 'all',
  onActionChange,
  selectedApp,
  onAppChange,
  availableApps,
  startDate,
  endDate,
  onDateChange,
  isRealtime,
  onToggleRealtime,
  onRefresh,
  isLoading,
}: SyslogFiltersProps) {
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today, today);
  };

  const handleSetAllTime = () => {
    onDateChange('', '');
  };

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (search) {
    chips.push({
      key: 'search',
      label: `Search: "${search}"`,
      onRemove: () => onSearchChange(''),
    });
  }

  if (selectedApp) {
    chips.push({
      key: 'app',
      label: `Service: ${selectedApp}`,
      onRemove: () => onAppChange(''),
    });
  }

  if (startDate || endDate) {
    const label =
      startDate === endDate
        ? `Date: ${startDate}`
        : `Range: ${startDate || 'start'} → ${endDate || 'now'}`;
    chips.push({
      key: 'date-range',
      label,
      onRemove: () => onDateChange('', ''),
    });
  }

  if (severityLevel !== 'all') {
    chips.push({
      key: 'severity',
      label: `Severity: ${severityLevel}`,
      onRemove: () => onSeverityChange('all'),
    });
  }

  if (actionFilter && actionFilter !== 'all') {
    chips.push({
      key: 'action',
      label: `Firewall: ${actionFilter}`,
      onRemove: () => onActionChange?.('all'),
    });
  }

  const handleClearAll = () => {
    onSearchChange('');
    onAppChange('');
    onDateChange('', '');
    onSeverityChange('all');
    onActionChange?.('all');
  };

  const hasActiveFilters = chips.length > 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-sm">
      {/* Top Row: Search, App Select, Date Range, Realtime & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search syslog messages, IP addresses, keywords..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Application / Daemon Filter */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedApp}
            onChange={(e) => onAppChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Services & Daemons</option>
            {availableApps.map((app) => (
              <option key={app} value={app}>
                {app.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          />
          <span className="text-slate-600">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          />
          <button
            type="button"
            onClick={handleSetToday}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
              startDate && startDate === endDate
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleSetAllTime}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
              !startDate && !endDate
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        {/* Controls: Live Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRealtime}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isRealtime
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isRealtime ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{isRealtime ? 'Live Tail' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bottom Row: Severity Level Tags */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3 text-slate-500" /> Severity:
        </span>

        <button
          type="button"
          onClick={() => onSeverityChange('all')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            severityLevel === 'all'
              ? 'bg-slate-200 text-slate-900 font-semibold'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All Severities
        </button>

        <button
          type="button"
          onClick={() => onSeverityChange('errors')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            severityLevel === 'errors'
              ? 'bg-rose-500 text-white font-semibold shadow-sm shadow-rose-500/30'
              : 'bg-slate-950 text-rose-400 hover:bg-rose-500/10 border border-rose-500/30'
          }`}
        >
          Critical & Errors (0-3)
        </button>

        <button
          type="button"
          onClick={() => onSeverityChange('warnings')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            severityLevel === 'warnings'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm shadow-amber-500/30'
              : 'bg-slate-950 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30'
          }`}
        >
          Warnings (4)
        </button>

        <button
          type="button"
          onClick={() => onSeverityChange('notices')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            severityLevel === 'notices'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/30'
              : 'bg-slate-950 text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/30'
          }`}
        >
          Notices (5)
        </button>

        <button
          type="button"
          onClick={() => onSeverityChange('info')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            severityLevel === 'info'
              ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30'
              : 'bg-slate-950 text-blue-400 hover:bg-blue-500/10 border border-blue-500/30'
          }`}
        >
          Informational (6)
        </button>

        {onActionChange && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Firewall:</span>
            <button
              type="button"
              onClick={() => onActionChange('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                actionFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onActionChange('block')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                actionFilter === 'block'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30 font-semibold'
                  : 'bg-slate-950 text-rose-400 hover:bg-rose-500/10 border border-rose-500/30'
              }`}
            >
              Blocks
            </button>
            <button
              type="button"
              onClick={() => onActionChange('pass')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                actionFilter === 'pass'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 font-semibold'
                  : 'bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              Passes
            </button>
          </div>
        )}
      </div>

      {/* Unified Active Filter Chips Bar */}
      {hasActiveFilters && (
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
