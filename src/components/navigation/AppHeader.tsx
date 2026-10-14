'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Network,
  Shield,
  Database,
  Users,
  HelpCircle,
  Columns2,
  Link2,
  FileCode,
  LogOut,
  UserCheck,
  ChevronDown,
  Settings,
  Sparkles,
  Radio,
  Layers,
} from 'lucide-react';
import { GlobalIpSearch } from './GlobalIpSearch';
import { CollectorHealthBadge } from './CollectorHealthBadge';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../auth/AuthContext';

interface AppHeaderProps {
  activeView?: 'squid' | 'softflowd' | 'split';
  onViewChange?: (view: 'squid' | 'softflowd' | 'split') => void;
  onOpenIpModal: () => void;
  onOpenBackupModal: () => void;
  onOpenConfigModal?: () => void;
  onOpenSquidConfig?: () => void;
  onOpenReportsModal?: () => void;
  onOpenSquidFeed?: () => void;
  onOpenNetflowFeed?: () => void;
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
  onOpenReportsModal,
  onOpenSquidFeed,
  onOpenNetflowFeed,
  onSelectProfile,
  onSelectDomain,
  onSelectPort,
  isFilterSynced,
  onToggleFilterSync,
}: AppHeaderProps) {
  const pathname = usePathname();
  const currentView = activeView || (pathname.startsWith('/softflowd') ? 'softflowd' : 'squid');
  const { user, isAdmin, logout } = useAuth();
  const [setupMenuOpen, setSetupMenuOpen] = useState(false);
  const setupMenuRef = useRef<HTMLDivElement>(null);

  // Close setup dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (setupMenuRef.current && !setupMenuRef.current.contains(event.target as Node)) {
        setSetupMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSetupOptions = !!(onOpenSquidConfig || onOpenConfigModal);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============================================================== */}
        {/* ROW 1: Brand Identity, Segmented Navigation Tabs, & Session */}
        {/* ============================================================== */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/50">
          
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
            className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner"
          >
            {onViewChange ? (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={currentView === 'squid'}
                  onClick={() => onViewChange('squid')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Squid (Proxy)</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={currentView === 'softflowd'}
                  onClick={() => onViewChange('softflowd')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>pfSense (Flows)</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={currentView === 'split'}
                  onClick={() => onViewChange('split')}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'split'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  title="Dual Panel Multitask NOC View"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  role="tab"
                  aria-selected={currentView === 'squid'}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'squid'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Squid (Proxy)</span>
                </Link>

                <Link
                  href="/softflowd"
                  role="tab"
                  aria-selected={currentView === 'softflowd'}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'softflowd'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>pfSense (Flows)</span>
                </Link>

                <Link
                  href="/?view=split"
                  role="tab"
                  aria-selected={currentView === 'split'}
                  className={`h-7 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                    currentView === 'split'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right: Collector Status, Theme & User Session */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Collector Health Indicator */}
            <CollectorHealthBadge className="h-8 inline-flex items-center gap-2 px-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer shadow-sm" />

            {/* Vertical Divider */}
            <div className="h-5 w-px bg-slate-800/80 mx-0.5" />

            {/* Theme Toggle */}
            <ThemeToggle className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm" />

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

        {/* ============================================================== */}
        {/* ROW 2: Global IP Search & Operational Tools Toolbar */}
        {/* ============================================================== */}
        <div className="py-2 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Global IP / Domain / Port Search */}
          <div className="w-full sm:w-72 md:w-80 lg:w-96">
            {onSelectProfile && (
              <GlobalIpSearch
                onSelectProfile={onSelectProfile}
                onSelectDomain={onSelectDomain}
                onSelectPort={onSelectPort}
              />
            )}
          </div>

          {/* Right: Operational Action Buttons with Standardized Sizing & Even Gaps */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {/* Filter Sync (Only when Split View is active) */}
            {onToggleFilterSync && currentView === 'split' && (
              <button
                type="button"
                onClick={onToggleFilterSync}
                className={`h-8 px-3 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                  isFilterSynced
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Sync IP and Date filters across both panels in real-time"
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFilterSynced ? 'Synced' : 'Sync Filters'}</span>
              </button>
            )}

            {/* IP Aliases */}
            <button
              type="button"
              onClick={onOpenIpModal}
              className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Manage Workstation IP to Employee & Department mappings"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>IP Aliases</span>
            </button>

            {/* Scheduled Word / AI Reports */}
            {onOpenReportsModal && (
              <button
                type="button"
                onClick={onOpenReportsModal}
                className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Generate automated executive Word reports with AI summaries"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reports (AI)</span>
              </button>
            )}

            {/* Quick Live Feed Details Popups */}
            {onOpenSquidFeed && (
              <button
                type="button"
                onClick={onOpenSquidFeed}
                className="h-8 px-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10"
                title="Open Squid Proxy Live Feed popup with complete logs & deep filters"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Squid Feed</span>
              </button>
            )}

            {onOpenNetflowFeed && (
              <button
                type="button"
                onClick={onOpenNetflowFeed}
                className="h-8 px-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-500/10"
                title="Open pfSense NetFlow Live Feed popup with session telemetry & socket filters"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>NetFlow Feed</span>
              </button>
            )}

            {/* System Settings */}
            <Link
              href="/settings"
              className={`h-8 px-3 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                pathname === '/settings'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/30'
                  : 'border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white'
              }`}
              title="System Settings, Users & Retention"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Settings</span>
            </Link>

            {/* Setup / Configuration Options Dropdown or Contextual Button */}
            {hasSetupOptions && (
              currentView === 'split' ? (
                <div ref={setupMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSetupMenuOpen((prev) => !prev)}
                    className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Configuration and setup guides for Squid & pfSense"
                    aria-expanded={setupMenuOpen}
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Setup</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${setupMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {setupMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-1 z-50 text-xs space-y-0.5 animate-in fade-in duration-100">
                      {onOpenSquidConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            setSetupMenuOpen(false);
                            onOpenSquidConfig();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileCode className="w-3.5 h-3.5 text-blue-400" />
                          <span>Squid Proxy Setup</span>
                        </button>
                      )}
                      {onOpenConfigModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setSetupMenuOpen(false);
                            onOpenConfigModal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                          <span>pfSense softflowd Setup</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : currentView === 'squid' && onOpenSquidConfig ? (
                <button
                  type="button"
                  onClick={onOpenSquidConfig}
                  className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Squid log forwarding setup"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Squid Setup</span>
                </button>
              ) : onOpenConfigModal ? (
                <button
                  type="button"
                  onClick={onOpenConfigModal}
                  className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="pfSense softflowd NetFlow setup"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>pfSense Setup</span>
                </button>
              ) : null
            )}

            {/* Database Backup & Restore */}
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="h-8 px-3 rounded-lg border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Backup and Restore SQLite database"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Backup</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
