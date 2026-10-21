'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Radio,
  RefreshCw,
  X,
  Filter,
  Link2,
  Server,
  Shield,
  Layers,
  Users,
  Sparkles,
  Database,
  ChevronDown,
  SlidersHorizontal,
  Tags,
  FileCode,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { SavedViewsDropdown, SavedViewItem } from './SavedViewsDropdown';

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
  onApplySavedView?: (view: SavedViewItem) => void;
  onOpenIpModal?: () => void;
  onOpenCategoriesModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenReportsModal?: () => void;
  onOpenSquidConfig?: () => void;
  onOpenConfigModal?: () => void;
  onOpenSyslogConfig?: () => void;
  onOpenSquidFeed?: () => void;
  onOpenNetflowFeed?: () => void;
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
  onApplySavedView,
  onOpenIpModal,
  onOpenCategoriesModal,
  onOpenBackupModal,
  onOpenReportsModal,
  onOpenSquidConfig,
  onOpenConfigModal,
  onOpenSyslogConfig,
  onOpenSquidFeed,
  onOpenNetflowFeed,
}: GlobalFilterBarProps) {
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && toolsMenuOpen) {
        setToolsMenuOpen(false);
        toolsButtonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toolsMenuOpen]);

  const hasMoreTools = Boolean(
    onOpenCategoriesModal ||
    onOpenSquidFeed ||
    onOpenNetflowFeed ||
    onOpenSquidConfig ||
    onOpenConfigModal ||
    onOpenSyslogConfig ||
    onOpenBackupModal
  );
  const handleTimePreset = (preset: '30m' | '1h' | 'today' | '7d' | '30d' | 'all') => {
    const today = new Date().toISOString().split('T')[0];
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
      next.startDate = today;
      next.endDate = today;
    } else if (preset === '7d') {
      next.timeWindow = undefined;
      const past = new Date();
      past.setDate(past.getDate() - 7);
      next.startDate = past.toISOString().split('T')[0];
      next.endDate = today;
    } else if (preset === '30d') {
      next.timeWindow = undefined;
      const past = new Date();
      past.setDate(past.getDate() - 30);
      next.startDate = past.toISOString().split('T')[0];
      next.endDate = today;
    } else if (preset === 'all') {
      next.timeWindow = undefined;
      next.startDate = undefined;
      next.endDate = undefined;
    }
    onFilterChange(next);
  };

  // Determine active preset based on filters state
  const is30mActive = filters.timeWindow === '30m';
  const is1hActive = filters.timeWindow === '1h';
  const isAllActive = !filters.timeWindow && !filters.startDate && !filters.endDate;

  // For presets that compare dates, calculate range span in days if dates exist
  let isTodayActive = false;
  let is7dActive = false;
  let is30dActive = false;

  if (!filters.timeWindow && filters.startDate && filters.endDate) {
    if (filters.startDate === filters.endDate) {
      isTodayActive = true;
    } else {
      const startMs = new Date(filters.startDate).getTime();
      const endMs = new Date(filters.endDate).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      if (diffDays === 7) is7dActive = true;
      else if (diffDays === 30) is30dActive = true;
    }
  }

  const isCustomDate = !filters.timeWindow && Boolean(filters.startDate || filters.endDate) && !isTodayActive && !is7dActive && !is30dActive;

  // Build active filter chips list (only for user-defined filters, omitting default 'all' state)
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.timeWindow === '30m') {
    chips.push({
      key: 'time-30m',
      label: 'Window: Last 30m',
      onRemove: () => onFilterChange({ ...filters, timeWindow: undefined }),
    });
  } else if (filters.timeWindow === '1h') {
    chips.push({
      key: 'time-1h',
      label: 'Window: Last 1h',
      onRemove: () => onFilterChange({ ...filters, timeWindow: undefined }),
    });
  } else if (isCustomDate) {
    const label =
      filters.startDate === filters.endDate
        ? `Date: ${filters.startDate}`
        : `Range: ${filters.startDate || 'start'} → ${filters.endDate || 'now'}`;
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

  const getPresetClass = (isActive: boolean) =>
    `px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="relative z-25 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm backdrop-blur-md space-y-2.5">
      {/* Row 1: Time Controls, Filter Scope Selectors, and Live Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Time Presets & Scope Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Presets Pill Group */}
          <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-lg p-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-2 pr-1.5 shrink-0">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Time:</span>
            </span>

            <button
              type="button"
              onClick={() => handleTimePreset('30m')}
              className={getPresetClass(is30mActive)}
            >
              30m
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('1h')}
              className={getPresetClass(is1hActive)}
            >
              1h
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('today')}
              className={getPresetClass(isTodayActive)}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('7d')}
              className={getPresetClass(is7dActive)}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('30d')}
              className={getPresetClass(is30dActive)}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('all')}
              className={getPresetClass(isAllActive)}
            >
              All
            </button>
          </div>

          {/* Custom Date Pickers */}
          <DateRangeSelector
            startDate={filters.startDate}
            endDate={filters.endDate}
            compact
            onChange={({ startDate, endDate }) =>
              onFilterChange({
                ...filters,
                startDate,
                endDate,
                timeWindow: undefined,
              })
            }
          />

          <div className="hidden xl:block h-5 w-px bg-slate-800" />

          {/* Scope Dropdowns Container (Client Host + Protocol + Service) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Client Host Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1 text-xs hover:border-slate-700 transition-colors">
              <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={filters.clientIp || ''}
                onChange={(e) => onFilterChange({ ...filters, clientIp: e.target.value || undefined })}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[170px] truncate"
                title="Filter by workstation host IP"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  All Client Hosts
                </option>
                {availableClientIps.map((item) => {
                  const ip = typeof item === 'string' ? item : item.clientIp;
                  const user = typeof item === 'object' && item.userName ? item.userName : null;
                  const dept = typeof item === 'object' && item.department ? ` (${item.department})` : '';
                  return (
                    <option key={ip} value={ip} className="bg-slate-900 text-slate-200">
                      {user ? `${ip} - ${user}${dept}` : ip}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* NetFlow Specific Filters (when on softflowd or split) */}
            {(activeView === 'softflowd' || activeView === 'split') && (
              <>
                {/* Protocol Dropdown */}
                <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1 text-xs hover:border-slate-700 transition-colors">
                  <Shield className="w-3 h-3 text-indigo-400 shrink-0" />
                  <select
                    value={filters.protocol || ''}
                    onChange={(e) => onFilterChange({ ...filters, protocol: e.target.value || undefined })}
                    className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                    title="Filter by L4 Protocol"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">All Protocols</option>
                    {availableProtocols.map((p) => (
                      <option key={p} value={p} className="bg-slate-900 text-slate-200">{p}</option>
                    ))}
                  </select>
                </div>

                {/* Service Dropdown */}
                <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1 text-xs hover:border-slate-700 transition-colors">
                  <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                  <select
                    value={filters.serviceName || ''}
                    onChange={(e) => onFilterChange({ ...filters, serviceName: e.target.value || undefined })}
                    className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
                    title="Filter by Application Service"
                  >
                    <option value="" className="bg-slate-900 text-slate-300">All Services</option>
                    {availableServices.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Operational Action Buttons & Live Controls */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* IP Aliases */}
          {onOpenIpModal && (
            <button
              type="button"
              onClick={onOpenIpModal}
              className="h-7 px-2.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Manage Workstation IP to Employee & Department mappings"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>IP Aliases</span>
            </button>
          )}

          {/* Scheduled Word / AI Reports */}
          {onOpenReportsModal && (
            <button
              type="button"
              onClick={onOpenReportsModal}
              className="h-7 px-2.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Generate automated executive Word reports with AI summaries"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Reports (AI)</span>
            </button>
          )}

          {/* Tools & Setup Dropdown */}
          {hasMoreTools && (
            <div ref={toolsMenuRef} className="relative">
              <button
                ref={toolsButtonRef}
                type="button"
                onClick={() => setToolsMenuOpen((prev) => !prev)}
                className="h-7 px-2.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                aria-expanded={toolsMenuOpen}
                aria-haspopup="menu"
                title="Operations, Live Feeds & Setup Guides"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tools</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-1 z-50 text-xs space-y-0.5 animate-in fade-in duration-100"
                >
                  {onOpenCategoriesModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenCategoriesModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Tags className="w-3.5 h-3.5 text-purple-400" />
                      <span>Domain Categories</span>
                    </button>
                  )}
                  {onOpenSquidFeed && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenSquidFeed();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Squid Live Feed</span>
                    </button>
                  )}
                  {onOpenNetflowFeed && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenNetflowFeed();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>NetFlow Live Feed</span>
                    </button>
                  )}
                  {onOpenSquidConfig && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenSquidConfig();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Squid Setup Guide</span>
                    </button>
                  )}
                  {onOpenConfigModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenConfigModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>pfSense softflowd Setup</span>
                    </button>
                  )}
                  {onOpenSyslogConfig && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenSyslogConfig();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>pfSense Syslog Setup</span>
                    </button>
                  )}
                  {onOpenBackupModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onOpenBackupModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span>Backup &amp; Restore</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Backup Database Quick Button */}
          {onOpenBackupModal && (
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="h-7 px-2.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm hidden lg:inline-flex"
              title="Backup and Restore SQLite database"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Backup</span>
            </button>
          )}

          {onToggleFilterSync && activeView === 'split' && (
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

          {onApplySavedView && (
            <SavedViewsDropdown
              currentFilters={filters}
              currentView={activeView}
              onApplyView={onApplySavedView}
            />
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer border border-slate-700/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Row 2: NetFlow Quick Traffic Type Selector (When in Softflowd or Split mode) */}
      {(activeView === 'softflowd' || activeView === 'split') && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Traffic Type:</span>
            <div className="inline-flex bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 text-[11px]">
              {(['all', 'external', 'internal'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, trafficType: type })}
                  className={`px-2.5 py-0.5 rounded capitalize font-medium transition-colors cursor-pointer ${
                    (filters.trafficType || 'all') === type
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={filters.hideFirewallTraffic !== false}
                onChange={(e) => onFilterChange({ ...filters, hideFirewallTraffic: e.target.checked })}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span>Hide Firewall Host</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={filters.hideProxyHop !== false}
                onChange={(e) => onFilterChange({ ...filters, hideProxyHop: e.target.checked })}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span>Hide Proxy Hop</span>
            </label>
          </div>
        </div>
      )}

      {/* Row 3: Active Filter Chips Bar (only rendered when user has applied non-default filters) */}
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
