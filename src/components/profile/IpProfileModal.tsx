'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  User,
  Building,
  Activity,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
  ExternalLink,
  Globe,
  Server,
  Layers,
  Edit2,
  Check,
  Filter,
  Copy,
  Minimize2,
  Maximize2,
  PanelRightClose,
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { IpProfileData } from '@/lib/db/profile-queries';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface IpProfileModalProps {
  ip: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFilterByIp?: (ip: string) => void;
  onUpdatedMapping?: () => void;
}

export function IpProfileModal({
  ip,
  isOpen,
  onClose,
  onFilterByIp,
  onUpdatedMapping,
}: IpProfileModalProps) {
  const [profile, setProfile] = useState<IpProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'squid' | 'softflowd'>('overview');

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingMapping, setSavingMapping] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<number | null>(null);

  // Multitasking Drawer / Docked state
  const [isDocked, setIsDocked] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen || !ip) {
      setProfile(null);
      setIsEditing(false);
      setIsMinimized(false);
      return;
    }
    setIsMinimized(false);

    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/profile?ip=${encodeURIComponent(ip)}`);
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.profile) {
            setProfile(data.profile);
            setEditUserName(data.profile.mapping.userName || '');
            setEditDepartment(data.profile.mapping.department || '');
            setEditNotes(data.profile.mapping.notes || '');
          } else {
            setError(data.error || 'Failed to load profile');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen, ip]);

  const modalRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: Boolean(isOpen && ip && !isMinimized),
    onClose,
  });

  if (!isOpen || !ip) return null;

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingMapping(true);
    try {
      const res = await fetch('/api/ip-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIp: profile.clientIp,
          userName: editUserName.trim() || undefined,
          department: editDepartment.trim() || undefined,
          notes: editNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile({
          ...profile,
          mapping: {
            ...profile.mapping,
            userName: editUserName.trim() || null,
            department: editDepartment.trim() || null,
            notes: editNotes.trim() || null,
          },
        });
        setIsEditing(false);
        onUpdatedMapping?.();
      } else {
        alert(data.error || 'Failed to save mapping');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving mapping');
    } finally {
      setSavingMapping(false);
    }
  };

  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalBandwidth = (profile?.squid.totalBytes || 0) + (profile?.softflowd.totalBytes || 0);

  if (isMinimized && isOpen && ip) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-bold text-white">{ip}</span>
          {profile?.mapping.userName && (
            <span className="text-xs text-indigo-300">({profile.mapping.userName})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restore Host Dossier"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Dossier"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const wrapperClass = isDocked
    ? 'fixed inset-0 pointer-events-none z-50'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in';

  const modalClass = isDocked
    ? 'pointer-events-auto fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[500px] lg:w-[560px] bg-slate-900/95 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200 h-screen'
    : 'bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ip-profile-title"
      className={wrapperClass}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`${modalClass} focus:outline-none`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ip-profile-title" className="font-mono text-base font-bold text-white tracking-wide">
                  {ip}
                </h2>
                {profile?.mapping.userName ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <User className="w-3 h-3" /> {profile.mapping.userName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic">No user assigned</span>
                )}
                {profile?.mapping.department && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    <Building className="w-3 h-3 text-slate-400" /> {profile.mapping.department}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Host Profiler &bull; Combined Web Proxy (Squid) &amp; L3/L4 Telemetry (softflowd)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onFilterByIp && (
              <button
                type="button"
                onClick={() => {
                  onFilterByIp(ip);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                title="Filter active dashboard by this IP"
              >
                <Filter className="w-3.5 h-3.5" />
                Filter View
              </button>
            )}

            <Link
              href={`/user/${encodeURIComponent(ip)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
              title="Open full user dossier page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Full Dossier ➔
            </Link>

            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              {isEditing ? 'Cancel' : 'Edit Alias'}
            </button>

            {/* Multitasking Controls */}
            <button
              type="button"
              onClick={() => setIsDocked((prev) => !prev)}
              aria-label={isDocked ? 'Expand to Centered Modal' : 'Dock to Right (Multitask Mode)'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDocked ? 'Expand to Centered Modal' : 'Dock to Right (Multitask Mode)'}
            >
              {isDocked ? <Maximize2 className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize Dossier (Float to Corner)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize Dossier (Float to Corner)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close host dossier dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveMapping}
            className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-end gap-3 text-xs"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Assigned Employee / User
              </label>
              <input
                type="text"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="e.g. Kenji Sato"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Department</label>
              <input
                type="text"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="e.g. Sales, Accounting"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Workstation Notes
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Dell XPS 15 (Floor 3)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingMapping}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Alias
            </button>
          </form>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <p className="text-sm">Assembling host dossier for {ip}...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs text-center">
              {error}
            </div>
          ) : profile ? (
            <>
              {/* Quick KPI Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Bandwidth</span>
                  <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">
                    {formatBytes(totalBandwidth)}
                  </div>
                  <span className="text-[10px] text-slate-500">Squid + softflowd</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
                    <ArrowDownCircle className="w-3 h-3" /> Download
                  </span>
                  <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
                    {formatBytes(profile.softflowd.downloadBytes || profile.squid.totalBytes)}
                  </div>
                  <span className="text-[10px] text-slate-500">Inbound to host</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 uppercase font-semibold flex items-center gap-1">
                    <ArrowUpCircle className="w-3 h-3" /> Upload
                  </span>
                  <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">
                    {formatBytes(profile.softflowd.uploadBytes)}
                  </div>
                  <span className="text-[10px] text-slate-500">Outbound to WAN</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">HTTP Requests</span>
                  <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                    {formatNumber(profile.squid.totalRequests)}
                  </div>
                  <span className="text-[10px] text-slate-500">Squid proxy logs</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-red-500/20">
                  <span className="text-[10px] text-red-400 uppercase font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Blocked Events
                  </span>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${profile.squid.blockedCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
                    {formatNumber(profile.squid.blockedCount)}
                  </div>
                  <span className="text-[10px] text-slate-500">Denied requests</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">L3/L4 Flows</span>
                  <div className="text-lg font-bold text-indigo-300 font-mono mt-0.5">
                    {formatNumber(profile.softflowd.totalFlows)}
                  </div>
                  <span className="text-[10px] text-slate-500">{formatNumber(profile.softflowd.totalPackets)} pkts</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview &amp; Destinations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('squid')}
                  className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'squid'
                      ? 'border-blue-500 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Web Proxy (Squid) &amp; Blocked URLs ({profile.squid.topDomains.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('softflowd')}
                  className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'softflowd'
                      ? 'border-indigo-500 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flow Telemetry (softflowd) ({profile.softflowd.recentFlows.length})
                </button>
              </div>

              {/* Tab 1: Overview & Destinations */}
              {activeTab === 'overview' && (
                <div className="space-y-6 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Visited Web Domains */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          Top Web Domains (Squid)
                        </h4>
                        <span className="text-[10px] text-slate-500">By Request Count</span>
                      </div>
                      {profile.squid.topDomains.length === 0 ? (
                        <p className="text-slate-500 text-xs py-4 text-center">No HTTP/S domains logged</p>
                      ) : (
                        <div className="space-y-2">
                          {profile.squid.topDomains.slice(0, 6).map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                              <span className="text-slate-300 truncate max-w-[200px]" title={d.domain}>{d.domain}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400">{formatNumber(d.requestCount)} reqs</span>
                                <span className="text-blue-300 font-semibold">{formatBytes(d.bytes)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top Remote Endpoints (softflowd) */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-indigo-400" />
                          Top Remote Endpoints (softflowd)
                        </h4>
                        <span className="text-[10px] text-slate-500">By Data Volume</span>
                      </div>
                      {profile.softflowd.topDestinations.length === 0 ? (
                        <p className="text-slate-500 text-xs py-4 text-center">No remote flows logged</p>
                      ) : (
                        <div className="space-y-2">
                          {profile.softflowd.topDestinations.slice(0, 6).map((dst, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                              <span className="text-cyan-300">{dst.dstIp}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400">{formatNumber(dst.flowCount)} flows</span>
                                <span className="text-indigo-300 font-semibold">{formatBytes(dst.bytes)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Network Services Used */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Top Network Services &amp; Ports
                    </h4>
                    {profile.softflowd.topServices.length === 0 ? (
                      <p className="text-slate-500 text-xs py-2">No service ports recorded</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {profile.softflowd.topServices.map((s, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                            <span className="font-semibold text-purple-300">{s.serviceName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Port {s.dstPort} &bull; {s.protocol}</span>
                            <span className="text-[11px] font-bold text-slate-200 mt-1 font-mono">{formatBytes(s.bytes)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Web Proxy (Squid) */}
              {activeTab === 'squid' && (
                <div className="space-y-6 text-xs">
                  {/* Blocked Requests Section */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        Blocked URL Incidents for this Host ({profile.squid.recentBlocked.length})
                      </h4>
                    </div>
                    {profile.squid.recentBlocked.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        No blocked web requests recorded for this IP address.
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-medium">
                              <th className="pb-2 w-36">Time</th>
                              <th className="pb-2 w-16">Method</th>
                              <th className="pb-2 w-32">Status</th>
                              <th className="pb-2">Full Blocked URL</th>
                              <th className="pb-2 w-12 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                            {profile.squid.recentBlocked.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-800/30">
                                <td className="py-2 text-slate-400">{b.formattedTime}</td>
                                <td className="py-2 text-indigo-300">{b.method}</td>
                                <td className="py-2 text-red-400 font-semibold">{b.resultCode}</td>
                                <td className="py-2 text-slate-200 truncate max-w-sm" title={b.url}>
                                  {b.url}
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(b.url, b.id)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    title="Copy URL"
                                  >
                                    {copiedUrl === b.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* All Top Visited Domains */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      All Top Visited Web Domains
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-medium">
                            <th className="pb-2">Domain</th>
                            <th className="pb-2 text-right">Requests</th>
                            <th className="pb-2 text-right">Volume</th>
                            <th className="pb-2 text-right">Blocked</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {profile.squid.topDomains.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-800/30">
                              <td className="py-2 text-slate-200">{d.domain}</td>
                              <td className="py-2 text-right text-slate-400">{formatNumber(d.requestCount)}</td>
                              <td className="py-2 text-right text-blue-300">{formatBytes(d.bytes)}</td>
                              <td className="py-2 text-right text-red-400 font-semibold">{d.blockedCount > 0 ? d.blockedCount : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Flow Telemetry (softflowd) */}
              {activeTab === 'softflowd' && (
                <div className="space-y-6 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Recent Flow Sessions for {ip}
                    </h4>
                    {profile.softflowd.recentFlows.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        No softflowd NetFlow sessions recorded for this host.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-medium">
                              <th className="pb-2 w-36">Time</th>
                              <th className="pb-2 w-20">Type</th>
                              <th className="pb-2 w-40">Remote Endpoint</th>
                              <th className="pb-2 w-28">Service / Port</th>
                              <th className="pb-2 w-16">Proto</th>
                              <th className="pb-2 text-right">Volume</th>
                              <th className="pb-2 text-right">Packets</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                            {profile.softflowd.recentFlows.map((f) => (
                              <tr key={f.id} className="hover:bg-slate-800/30">
                                <td className="py-2 text-slate-400">{f.formattedTime}</td>
                                <td className="py-2">
                                  {f.direction === 'download' ? (
                                    <span className="text-emerald-400 font-semibold">⬇ DL</span>
                                  ) : f.direction === 'upload' ? (
                                    <span className="text-purple-400 font-semibold">⬆ UL</span>
                                  ) : (
                                    <span className="text-slate-400">↔ LAN</span>
                                  )}
                                </td>
                                <td className="py-2 text-cyan-300">{f.remoteIp}</td>
                                <td className="py-2 text-slate-300 font-sans">
                                  <span className="font-semibold text-purple-300">{f.serviceName}</span> ({f.port})
                                </td>
                                <td className="py-2 text-slate-400">{f.protocol}</td>
                                <td className={`py-2 text-right font-semibold ${
                                  f.direction === 'download' ? 'text-emerald-400' : 'text-purple-400'
                                }`}>
                                  {formatBytes(f.bytes)}
                                </td>
                                <td className="py-2 text-right text-slate-400">{formatNumber(f.packets)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Host: <strong className="font-mono text-slate-300">{ip}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
