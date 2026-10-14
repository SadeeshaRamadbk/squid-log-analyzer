'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Calendar, X, ChevronDown, Check, Clock, CalendarDays } from 'lucide-react';

export interface DateRangeSelectorProps {
  startDate?: string;
  endDate?: string;
  minDate?: string;
  maxDate?: string;
  onChange: (range: { startDate?: string; endDate?: string }) => void;
  className?: string;
  compact?: boolean;
}

export function DateRangeSelector({
  startDate,
  endDate,
  minDate,
  maxDate,
  onChange,
  className = '',
  compact = false,
}: DateRangeSelectorProps) {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenStartPicker = () => {
    try {
      startInputRef.current?.showPicker();
    } catch {
      startInputRef.current?.focus();
    }
  };

  const handleOpenEndPicker = () => {
    try {
      endInputRef.current?.showPicker();
    } catch {
      endInputRef.current?.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: undefined, endDate: undefined });
  };

  const applyPreset = (preset: 'today' | 'yesterday' | '3days' | '7days' | '30days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let start = todayStr;
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      start = yStr;
      end = yStr;
    } else if (preset === '3days') {
      const p = new Date(now);
      p.setDate(p.getDate() - 3);
      start = p.toISOString().split('T')[0];
      end = todayStr;
    } else if (preset === '7days') {
      const p = new Date(now);
      p.setDate(p.getDate() - 7);
      start = p.toISOString().split('T')[0];
      end = todayStr;
    } else if (preset === '30days') {
      const p = new Date(now);
      p.setDate(p.getDate() - 30);
      start = p.toISOString().split('T')[0];
      end = todayStr;
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
      end = todayStr;
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    }

    onChange({ startDate: start, endDate: end });
    setDropdownOpen(false);
  };

  const hasSelection = Boolean(startDate || endDate);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-1.5 rounded-xl border transition-all ${
        dropdownOpen ? 'z-50' : 'z-10'
      } ${
        hasSelection
          ? 'bg-purple-950/30 border-purple-500/50 text-purple-200 shadow-sm'
          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
      } ${className}`}
    >
      {/* Calendar Icon Button with Quick Presets Dropdown */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-medium ${
          hasSelection ? 'text-purple-300' : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Quick date presets"
        aria-expanded={dropdownOpen}
      >
        <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Start Date Input */}
      <div className="relative flex items-center">
        <input
          ref={startInputRef}
          type="date"
          value={startDate || ''}
          min={minDate || undefined}
          max={maxDate || undefined}
          style={{ colorScheme: 'dark' }}
          onChange={(e) => onChange({ startDate: e.target.value || undefined, endDate })}
          className={`bg-transparent ${
            compact ? 'text-[11px] py-1' : 'text-xs py-1.5'
          } font-mono text-slate-200 focus:outline-none cursor-pointer pl-1 pr-1`}
          title="Filter start date"
        />
      </div>

      <span className="text-slate-500 text-[11px] font-mono select-none">to</span>

      {/* End Date Input */}
      <div className="relative flex items-center">
        <input
          ref={endInputRef}
          type="date"
          value={endDate || ''}
          min={minDate || undefined}
          max={maxDate || undefined}
          style={{ colorScheme: 'dark' }}
          onChange={(e) => onChange({ startDate, endDate: e.target.value || undefined })}
          className={`bg-transparent ${
            compact ? 'text-[11px] py-1' : 'text-xs py-1.5'
          } font-mono text-slate-200 focus:outline-none cursor-pointer pl-1 pr-1`}
          title="Filter end date"
        />
      </div>

      {/* Reset/Clear Button */}
      {hasSelection && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 mr-1.5 rounded-md hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          title="Clear date filter"
          aria-label="Clear date filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Quick Date Presets Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-1 z-[100] text-xs space-y-0.5 animate-in fade-in duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            Quick Date Presets
          </div>

          <button
            type="button"
            onClick={() => applyPreset('today')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Today</span>
            <span className="text-[10px] font-mono text-slate-500">24h</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('yesterday')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Yesterday</span>
            <span className="text-[10px] font-mono text-slate-500">-1d</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('3days')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Last 3 Days</span>
            <span className="text-[10px] font-mono text-slate-500">3d</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('7days')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Last 7 Days</span>
            <span className="text-[10px] font-mono text-slate-500">1w</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('30days')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Last 30 Days</span>
            <span className="text-[10px] font-mono text-slate-500">1m</span>
          </button>

          <div className="h-px bg-slate-800 my-0.5" />

          <button
            type="button"
            onClick={() => applyPreset('thisMonth')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>This Month</span>
            <span className="text-[10px] font-mono text-slate-500">MTD</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('lastMonth')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Last Month</span>
            <span className="text-[10px] font-mono text-slate-500">Prev</span>
          </button>

          {hasSelection && (
            <>
              <div className="h-px bg-slate-800 my-0.5" />
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Clear Date Range</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
