'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Network,
  Shield,
  Columns2,
  LogOut,
  UserCheck,
  Settings,
  Terminal,
  Eye,
  EyeOff,
  Keyboard,
} from 'lucide-react';
import { GlobalIpSearch } from './GlobalIpSearch';
import { CollectorHealthBadge } from './CollectorHealthBadge';
import { ThemeToggle } from '../common/ThemeToggle';
import { DensityToggle } from '../common/DensityToggle';
import { useAuth } from '../auth/AuthContext';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface AppHeaderProps {
  activeView?: 'squid' | 'softflowd' | 'syslog' | 'split';
  onViewChange?: (view: 'squid' | 'softflowd' | 'split') => void;
  onOpenIpModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenCategoriesModal?: () => void;
  onOpenConfigModal?: () => void;
  onOpenSquidConfig?: () => void;
  onOpenSyslogConfig?: () => void;
  onOpenReportsModal?: () => void;
  onOpenSquidFeed?: () => void;
  onOpenNetflowFeed?: () => void;
  onOpenShortcuts?: () => void;
  onSelectProfile?: (ip: string) => void;
  onSelectDomain?: (domain: string) => void;
  onSelectPort?: (port: number, protocol?: string) => void;
  isFilterSynced?: boolean;
  onToggleFilterSync?: () => void;
}

export function AppHeader({
  activeView,
  onViewChange,
  onSelectProfile,
  onSelectDomain,
  onSelectPort,
  onOpenShortcuts,
}: AppHeaderProps) {
  const pathname = usePathname();
  const currentView = activeView || (pathname.startsWith('/syslog') ? 'syslog' : pathname.startsWith('/softflowd') ? 'softflowd' : 'squid');
  const { user, isAdmin, logout } = useAuth();
  const isPrivacyMode = usePrivacyMode();

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLElement>, viewName: 'squid' | 'softflowd' | 'split' | 'syslog') => {
    const tabs: ('squid' | 'softflowd' | 'split' | 'syslog')[] = ['squid', 'softflowd', 'split', 'syslog'];
    const currentIndex = tabs.indexOf(viewName);
    let targetIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1) {
      const nextView = tabs[targetIndex];
      const targetEl = document.getElementById(`tab-${nextView}`);
      targetEl?.focus();
      if (onViewChange && nextView !== 'syslog') {
        onViewChange(nextView as any);
      }
    }
  };

  const handleTogglePrivacy = () => {
    const next = !isPrivacyMode;
    try {
      localStorage.setItem('privacy_mode', String(next));
      window.dispatchEvent(new Event('privacy-mode-change'));
    } catch {}
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============================================================== */}
        {/* LEVEL 1: Brand, Nav Tabs, Quick Search (Ctrl+K), & User/Theme */}
        {/* ============================================================== */}
        <div className="py-2.5 flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-2">
          
          {/* Brand Identity & Environment */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition-colors shadow-sm">
              {currentView === 'softflowd' ? (
                <Shield className="w-4.5 h-4.5 text-indigo-400" />
              ) : currentView === 'split' ? (
                <Columns2 className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Network className="w-4.5 h-4.5 text-blue-400" />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">
                  Nippon BPO NOC
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-indigo-300 border border-slate-700 font-mono">
                  nipponbpo.local
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">
                Squid Proxy & NetFlow Telemetry
              </span>
            </div>
          </Link>

          {/* Navigation Tabs (Segmented Control) */}
          <nav
            role="tablist"
            aria-label="Module Views"
            className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner overflow-x-auto scrollbar-none shrink-0"
          >
            {onViewChange ? (
              <>
                <button
                  type="button"
                  id="tab-squid"
                  role="tab"
                  aria-selected={currentView === 'squid'}
                  tabIndex={currentView === 'squid' ? 0 : -1}
                  aria-controls="panel-squid"
                  onClick={() => onViewChange('squid')}
                  onKeyDown={(e) => handleTabKeyDown(e, 'squid')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Squid (Proxy)</span>
                </button>

                <button
                  type="button"
                  id="tab-softflowd"
                  role="tab"
                  aria-selected={currentView === 'softflowd'}
                  tabIndex={currentView === 'softflowd' ? 0 : -1}
                  aria-controls="panel-softflowd"
                  onClick={() => onViewChange('softflowd')}
                  onKeyDown={(e) => handleTabKeyDown(e, 'softflowd')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>pfSense (Flows)</span>
                </button>

                <button
                  type="button"
                  id="tab-split"
                  role="tab"
                  aria-selected={currentView === 'split'}
                  tabIndex={currentView === 'split' ? 0 : -1}
                  aria-controls="panel-split"
                  onClick={() => onViewChange('split')}
                  onKeyDown={(e) => handleTabKeyDown(e, 'split')}
                  className={`h-7 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'split'
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Dual Panel Multitask NOC View"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </button>

                <Link
                  href="/syslog"
                  id="tab-syslog"
                  role="tab"
                  aria-selected={currentView === 'syslog'}
                  tabIndex={currentView === 'syslog' ? 0 : -1}
                  aria-controls="panel-syslog"
                  onKeyDown={(e) => handleTabKeyDown(e, 'syslog')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'syslog'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Syslog (Events)</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  id="tab-squid"
                  role="tab"
                  aria-selected={currentView === 'squid'}
                  tabIndex={currentView === 'squid' ? 0 : -1}
                  aria-controls="panel-squid"
                  onKeyDown={(e) => handleTabKeyDown(e, 'squid')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Squid (Proxy)</span>
                </Link>

                <Link
                  href="/softflowd"
                  id="tab-softflowd"
                  role="tab"
                  aria-selected={currentView === 'softflowd'}
                  tabIndex={currentView === 'softflowd' ? 0 : -1}
                  aria-controls="panel-softflowd"
                  onKeyDown={(e) => handleTabKeyDown(e, 'softflowd')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>pfSense (Flows)</span>
                </Link>

                <Link
                  href="/syslog"
                  id="tab-syslog"
                  role="tab"
                  aria-selected={currentView === 'syslog'}
                  tabIndex={currentView === 'syslog' ? 0 : -1}
                  aria-controls="panel-syslog"
                  onKeyDown={(e) => handleTabKeyDown(e, 'syslog')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'syslog'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Syslog (Events)</span>
                </Link>

                <Link
                  href="/?view=split"
                  id="tab-split"
                  role="tab"
                  aria-selected={currentView === 'split'}
                  tabIndex={currentView === 'split' ? 0 : -1}
                  aria-controls="panel-split"
                  onKeyDown={(e) => handleTabKeyDown(e, 'split')}
                  className={`h-7 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    currentView === 'split'
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </Link>
              </>
            )}
          </nav>

          {/* Quick Search (Ctrl+K) */}
          <div className="flex-1 min-w-[200px] max-w-xs xl:max-w-sm hidden md:block">
            {onSelectProfile && (
              <GlobalIpSearch
                onSelectProfile={onSelectProfile}
                onSelectDomain={onSelectDomain}
                onSelectPort={onSelectPort}
              />
            )}
          </div>

          {/* Right: Collector Status, Privacy, Density, Theme & User Session */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto 2xl:ml-0">
            {/* Collector Health Indicator */}
            <CollectorHealthBadge className="h-8 inline-flex items-center gap-2 px-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer shadow-sm" />

            {/* Vertical Divider */}
            <div className="h-5 w-px bg-slate-800/80 mx-0.5" />

            {/* Privacy Mode Toggle */}
            <button
              type="button"
              onClick={handleTogglePrivacy}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isPrivacyMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
              }`}
              title={isPrivacyMode ? 'Privacy Mode is ACTIVE (Employee names masked)' : 'Privacy Mode is OFF (Click to mask employee names)'}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline font-sans">{isPrivacyMode ? 'Privacy ON' : 'Privacy'}</span>
            </button>

            {/* Density Toggle */}
            <DensityToggle />

            {/* Theme Toggle */}
            <ThemeToggle className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm" />

            {/* Keyboard Shortcuts Dialog Trigger (Press ?) */}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                aria-label="Keyboard shortcuts (press ?)"
                className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm"
                title="Keyboard Shortcuts Cheat Sheet (Press ?)"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            )}

            {/* User Profile Pill & Sign Out */}
            {user && (
              <div className="flex items-center gap-1.5 pl-1">
                <div className="h-8 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs flex items-center gap-2 shadow-sm">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">{user.username}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                      isAdmin
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <Link
                  href="/settings"
                  className={`h-8 w-8 rounded-lg border transition-colors flex items-center justify-center shadow-sm cursor-pointer ${
                    pathname === '/settings'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                  }`}
                  title="Settings & User Management"
                  aria-label="Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                  title={`Sign out (${user.username})`}
                  aria-label={`Sign out ${user.username}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Small Screen Quick Search (visible on mobile < md) */}
        <div className="pb-2.5 md:hidden">
          {onSelectProfile && (
            <GlobalIpSearch
              onSelectProfile={onSelectProfile}
              onSelectDomain={onSelectDomain}
              onSelectPort={onSelectPort}
            />
          )}
        </div>

      </div>
    </header>
  );
}
