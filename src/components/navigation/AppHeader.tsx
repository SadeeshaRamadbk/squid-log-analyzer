'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, Shield, Database, Users, HelpCircle, Columns2, Link2, FileCode } from 'lucide-react';
import { GlobalIpSearch } from './GlobalIpSearch';
import { CollectorHealthBadge } from './CollectorHealthBadge';
import { ThemeToggle } from '../common/ThemeToggle';

interface AppHeaderProps {
  activeView?: 'squid' | 'softflowd' | 'split';
  onViewChange?: (view: 'squid' | 'softflowd' | 'split') => void;
  onOpenIpModal: () => void;
  onOpenBackupModal: () => void;
  onOpenConfigModal?: () => void;
  onOpenSquidConfig?: () => void;
  onSelectProfile?: (ip: string) => void;
  onSelectDomain?: (domain: string) => void;
  onSelectPort?: (port: number, protocol?: string) => void;
  isFilterSynced?: boolean;
  onToggleFilterSync?: () => void;
}

export function AppHeader({
  activeView,
  onViewChange,
  onOpenIpModal,
  onOpenBackupModal,
  onOpenConfigModal,
  onOpenSquidConfig,
  onSelectProfile,
  onSelectDomain,
  onSelectPort,
  isFilterSynced,
  onToggleFilterSync,
}: AppHeaderProps) {
  const pathname = usePathname();
  const currentView = activeView || (pathname.startsWith('/softflowd') ? 'softflowd' : 'squid');

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Brand & Module Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              {currentView === 'softflowd' ? (
                <Shield className="w-5 h-5" />
              ) : currentView === 'split' ? (
                <Columns2 className="w-5 h-5 text-indigo-300" />
              ) : (
                <Network className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  {currentView === 'softflowd'
                    ? 'pfSense softflowd Flow Analyzer'
                    : currentView === 'split'
                    ? 'Unified Network & Proxy NOC'
                    : 'Squid Proxy Log Analyzer'}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-mono">
                  nipponbpo.local
                </span>
                {currentView === 'split' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Dual Panel
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {currentView === 'softflowd'
                  ? 'softflowd 1.2.6_4 • NetFlow v5 UDP 2055 • L3/L4 Traffic'
                  : currentView === 'split'
                  ? 'Real-Time Multitasking: HTTP/S Audit + pfSense L3/L4 Telemetry side-by-side'
                  : 'HTTP/S Audit & Privacy • SQLite WAL • Separated In/Out Bandwidth'}
              </p>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            {onViewChange ? (
              <>
                <button
                  type="button"
                  onClick={() => onViewChange('squid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  Squid (HTTP/S)
                </button>

                <button
                  type="button"
                  onClick={() => onViewChange('softflowd')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  pfSense (L3/L4)
                </button>

                <button
                  type="button"
                  onClick={() => onViewChange('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentView === 'split'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Multitasking Split View: Squid + pfSense side-by-side"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  Multitask Split View
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  Squid (HTTP/S)
                </Link>

                <Link
                  href="/softflowd"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  pfSense (L3/L4)
                </Link>

                <Link
                  href="/?view=split"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    currentView === 'split'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  Split View
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Center/Right: Health Indicator, Global Search & Tool Modals */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <CollectorHealthBadge />

          {onSelectProfile && (
            <div className="w-full sm:w-60 md:w-64">
              <GlobalIpSearch
                onSelectProfile={onSelectProfile}
                onSelectDomain={onSelectDomain}
                onSelectPort={onSelectPort}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {onToggleFilterSync && (
              <button
                type="button"
                onClick={onToggleFilterSync}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors font-medium cursor-pointer ${
                  isFilterSynced
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Sync IP and Date filters across both panels in real-time"
              >
                <Link2 className="w-3.5 h-3.5" />
                {isFilterSynced ? 'Synced' : 'Sync Filters'}
              </button>
            )}

            {onOpenSquidConfig && (currentView === 'squid' || currentView === 'split') && (
              <button
                type="button"
                onClick={onOpenSquidConfig}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors font-medium cursor-pointer"
                title="Squid log forwarding setup"
              >
                <FileCode className="w-3.5 h-3.5" />
                Squid Setup
              </button>
            )}

            {onOpenConfigModal && (currentView === 'softflowd' || currentView === 'split') && (
              <button
                type="button"
                onClick={onOpenConfigModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors font-medium cursor-pointer"
                title="pfSense softflowd NetFlow setup"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                pfSense Setup
              </button>
            )}

            <button
              type="button"
              onClick={onOpenIpModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors font-medium cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              IP Aliases
            </button>

            <button
              type="button"
              onClick={onOpenBackupModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors font-medium cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Backup
            </button>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
