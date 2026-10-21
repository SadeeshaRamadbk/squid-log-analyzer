'use client';

import React from 'react';
import { X, RefreshCw, Server, Clock, Radio, Network, Tag, ShieldCheck, Layers, Filter } from 'lucide-react';
import { DateRangeSelector } from '../common/DateRangeSelector';

interface SoftflowdFiltersProps {
  startDate?: string;
  endDate?: string;
  srcIp?: string;
  dstIp?: string;
  protocol?: string;
  serviceName?: string;
  timeWindow?: '30m' | '1h';
  hideFirewallTraffic?: boolean;
  hideProxyHop?: boolean;
  trafficType?: 'all' | 'external' | 'internal';
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
    hideFirewallTraffic?: boolean;
    hideProxyHop?: boolean;
    trafficType?: 'all' | 'external' | 'internal';
  }) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isRealTime: boolean;
  onToggleRealTime: () => void;
  onOpenSquidFeed?: () => void;
  onOpenNetflowFeed?: () => void;
}

export function SoftflowdFilters({
  startDate,
  endDate,
  srcIp,
  dstIp,
  protocol,
  serviceName,
  timeWindow,
  hideFirewallTraffic = true,
  hideProxyHop = true,
  trafficType = 'all',
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
  onOpenSquidFeed,
  onOpenNetflowFeed,
}: SoftflowdFiltersProps) {
  const handlePreset = (preset: '30m' | '1h' | 'today' | '7d' | '30d' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const base = { srcIp, dstIp, protocol, serviceName, hideFirewallTraffic, hideProxyHop, trafficType };

    if (preset === '30m') {
      onFilterChange({ ...base, startDate: undefined, endDate: undefined, timeWindow: '30m' });
    } else if (preset === '1h') {
      onFilterChange({ ...base, startDate: undefined, endDate: undefined, timeWindow: '1h' });
    } else if (preset === 'all') {
      onFilterChange({ ...base, startDate: undefined, endDate: undefined, timeWindow: undefined });
    } else if (preset === 'today') {
      onFilterChange({ ...base, startDate: todayStr, endDate: todayStr, timeWindow: undefined });
    } else if (preset === '7d') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      onFilterChange({ ...base, startDate: past.toISOString().split('T')[0], endDate: todayStr, timeWindow: undefined });
    } else if (preset === '30d') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      onFilterChange({ ...base, startDate: past.toISOString().split('T')[0], endDate: todayStr, timeWindow: undefined });
    }
  };

  const baseFilter = {
    startDate,
    endDate,
    srcIp,
    dstIp,
    protocol,
    serviceName,
    timeWindow,
    hideFirewallTraffic,
    hideProxyHop,
    trafficType,
  };

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (timeWindow === '30m') {
    chips.push({
      key: 'time-30m',
      label: 'Window: Last 30m',
      onRemove: () => onFilterChange({ ...baseFilter, timeWindow: undefined }),
    });
  } else if (timeWindow === '1h') {
    chips.push({
      key: 'time-1h',
      label: 'Window: Last 1h',
      onRemove: () => onFilterChange({ ...baseFilter, timeWindow: undefined }),
    });
  } else if (startDate || endDate) {
    const label =
      startDate === endDate
        ? `Date: ${startDate}`
        : `Range: ${startDate || 'start'} → ${endDate || 'now'}`;
    chips.push({
      key: 'date-range',
      label,
      onRemove: () => onFilterChange({ ...baseFilter, startDate: undefined, endDate: undefined }),
    });
  }

  if (srcIp) {
    const match = availableClientIps.find(
      (item) => (typeof item === 'string' ? item : item.clientIp) === srcIp
    );
    const userLabel =
      match && typeof match === 'object' && match.userName
        ? `${srcIp} (${match.userName})`
        : srcIp;
    chips.push({
      key: 'src-ip',
      label: `Src: ${userLabel}`,
      onRemove: () => onFilterChange({ ...baseFilter, srcIp: undefined }),
    });
  }

  if (dstIp) {
    chips.push({
      key: 'dst-ip',
      label: `Dst: ${dstIp}`,
      onRemove: () => onFilterChange({ ...baseFilter, dstIp: undefined }),
    });
  }

  if (protocol) {
    chips.push({
      key: 'protocol',
      label: `Proto: ${protocol}`,
      onRemove: () => onFilterChange({ ...baseFilter, protocol: undefined }),
    });
  }

  if (serviceName) {
    chips.push({
      key: 'service',
      label: `Service: ${serviceName}`,
      onRemove: () => onFilterChange({ ...baseFilter, serviceName: undefined }),
    });
  }

  if (trafficType && trafficType !== 'all') {
    chips.push({
      key: 'traffic',
      label: `Traffic: ${trafficType}`,
      onRemove: () => onFilterChange({ ...baseFilter, trafficType: 'all' }),
    });
  }

  const handleClearAll = () => {
    onFilterChange({
      startDate: undefined,
      endDate: undefined,
      srcIp: undefined,
      dstIp: undefined,
      protocol: undefined,
      serviceName: undefined,
      timeWindow: undefined,
      hideFirewallTraffic: true,
      hideProxyHop: true,
      trafficType: 'all',
    });
  };

  const hasActiveFilters = chips.length > 0;

  return (
    <div className="relative z-20 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-md space-y-3">
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

      {/* Middle Row: Smart Filter Toggles (Hide Firewall, Hide Proxy Hop) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Hop Isolation:
        </span>

        {/* Toggle: Hide Firewall Self-Traffic */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              startDate,
              endDate,
              srcIp,
              dstIp,
              protocol,
              serviceName,
              timeWindow,
              hideFirewallTraffic: !hideFirewallTraffic,
              hideProxyHop,
              trafficType,
            })
          }
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
            hideFirewallTraffic
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Exclude pfSense router self-traffic (192.168.0.1) from talker stats"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${hideFirewallTraffic ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          Hide Firewall (192.168.0.1)
        </button>

        {/* Toggle: Hide Proxy Hop (Port 3128) */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              startDate,
              endDate,
              srcIp,
              dstIp,
              protocol,
              serviceName,
              timeWindow,
              hideFirewallTraffic,
              hideProxyHop: !hideProxyHop,
              trafficType,
            })
          }
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
            hideProxyHop
              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
              : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Exclude Squid proxy hop (:3128) to avoid double-counting web traffic"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${hideProxyHop ? 'bg-indigo-400' : 'bg-slate-500'}`} />
          Hide Proxy Hop (:3128)
        </button>
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
                hideFirewallTraffic,
                hideProxyHop,
                trafficType,
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
                hideFirewallTraffic,
                hideProxyHop,
                trafficType,
              })
            }
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-2"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Protocols
            </option>
            {(availableProtocols && availableProtocols.length > 0 ? availableProtocols : ['TCP', 'UDP', 'ICMP', 'GRE', 'ESP']).map((p) => (
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
                hideFirewallTraffic,
                hideProxyHop,
                trafficType,
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
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          minDate={minDate || undefined}
          maxDate={maxDate || undefined}
          onChange={({ startDate: s, endDate: e }) =>
            onFilterChange({
              startDate: s,
              endDate: e,
              srcIp,
              dstIp,
              protocol,
              serviceName,
              timeWindow: undefined,
              hideFirewallTraffic,
              hideProxyHop,
              trafficType,
            })
          }
        />

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
