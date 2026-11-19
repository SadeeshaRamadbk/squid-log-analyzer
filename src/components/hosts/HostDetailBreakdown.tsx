'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  Server,
  Terminal,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldAlert,
  Clock,
  Download,
  ExternalLink,
  Edit2,
  Check,
  X,
  User,
  Building,
  Filter,
  Copy,
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { IpProfileData } from '@/lib/db/profile-queries';
import { maskEmployeeName } from '@/lib/privacy';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface HostDetailBreakdownProps {
  ip: string;
  onClose?: () => void;
  onUpdatedMapping?: () => void;
}

export function HostDetailBreakdown({ ip, onClose, onUpdatedMapping }: HostDetailBreakdownProps) {
  const [profile, setProfile] = useState<IpProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'squid' | 'flows' | 'syslog' | 'timeline' | 'edit'>('overview');
  const [copiedUrl, setCopiedUrl] = useState<number | null>(null);

  // Inline edit state
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingMapping, setSavingMapping] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isPrivacyMode = usePrivacyMode();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/profile?ip=${encodeURIComponent(ip)}`);
      const json = await res.json();
      if (json.success && json.profile) {
        setProfile(json.profile);
        setEditName(json.profile.mapping?.userName || '');
        setEditDept(json.profile.mapping?.department || '');
        setEditNotes(json.profile.mapping?.notes || '');
      } else {
        setError(json.error || 'Failed to load host profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [ip]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSavingMapping(true);
      const res = await fetch('/api/ip-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIp: profile.clientIp,
          userName: editName.trim(),
          department: editDept.trim(),
          notes: editNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchProfile();
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

  const handleCopyUrl = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Export User Dossier to Microsoft Word (.doc)
  const handleExportWordDoc = () => {
    if (!profile) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Host Telemetry Dossier: ${profile.mapping.userName || profile.clientIp}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 40px; color: #222; }
          h1 { color: #1e3a8a; font-size: 24pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
          h2 { color: #1e40af; font-size: 16pt; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .badge { background-color: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Unified Network Telemetry Dossier</h1>
        <p><strong>Target Host IP:</strong> ${profile.clientIp} | <strong>Employee:</strong> ${profile.mapping.userName || 'Unassigned'} | <strong>Department:</strong> ${profile.mapping.department || 'N/A'}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} (Asia/Colombo UTC+5:30)</p>
        
        <h2>Activity Overview (All Sources)</h2>
        <table>
          <tr><th>Telemetry Source</th><th>Metric</th><th>Volume / Value</th></tr>
          <tr><td>Squid Proxy (L7 HTTP/S)</td><td>Web Requests</td><td>${formatNumber(profile.squid.totalRequests)} requests (${formatBytes(profile.squid.totalBytes)})</td></tr>
          <tr><td>Squid Proxy (L7 HTTP/S)</td><td>Policy Blocks</td><td>${formatNumber(profile.squid.blockedCount)} blocked requests</td></tr>
          <tr><td>pfSense softflowd (L3/L4)</td><td>Total Network Flows</td><td>${formatNumber(profile.softflowd.totalFlows)} flows (${formatBytes(profile.softflowd.totalBytes)})</td></tr>
          <tr><td>pfSense softflowd (L3/L4)</td><td>Download Bandwidth</td><td>${formatBytes(profile.softflowd.downloadBytes)}</td></tr>
          <tr><td>pfSense softflowd (L3/L4)</td><td>Upload Bandwidth</td><td>${formatBytes(profile.softflowd.uploadBytes)}</td></tr>
          <tr><td>pfSense Syslog (Firewall)</td><td>Filterlog Events</td><td>${formatNumber(profile.syslog.totalEvents)} events</td></tr>
          <tr><td>pfSense Syslog (Firewall)</td><td>Firewall Block Drops</td><td>${formatNumber(profile.syslog.firewallBlocks)} dropped packets</td></tr>
        </table>

        <h2>Top Requested Web Domains (Squid)</h2>
        <table>
          <tr><th>Domain</th><th>Requests</th><th>Volume</th><th>Blocked Count</th></tr>
          ${profile.squid.topDomains.slice(0, 15).map((d) => `
            <tr>
              <td>${d.domain}</td>
              <td>${formatNumber(d.requestCount)}</td>
              <td>${formatBytes(d.bytes)}</td>
              <td>${d.blockedCount > 0 ? `<span class="badge">${d.blockedCount}</span>` : '0'}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Top Network Services & Ports (pfSense NetFlow)</h2>
        <table>
          <tr><th>Service / Port</th><th>Protocol</th><th>Flow Count</th><th>Volume</th></tr>
          ${profile.softflowd.topServices.slice(0, 10).map((s) => `
            <tr>
              <td>${s.serviceName} (${s.dstPort})</td>
              <td>${s.protocol}</td>
              <td>${formatNumber(s.flowCount)}</td>
              <td>${formatBytes(s.bytes)}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Host_Dossier_${profile.clientIp}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayName = profile?.mapping.userName
    ? isPrivacyMode
      ? maskEmployeeName(profile.mapping.userName)
      : profile.mapping.userName
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white font-mono">{ip}</span>
              {displayName ? (
                <span className="text-sm font-semibold text-slate-200">
                  {displayName}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Unassigned Host
                </span>
              )}
              {profile?.mapping.department && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 font-medium">
                  <Building className="w-3 h-3" />
                  {profile.mapping.department}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified 360° Telemetry Breakdown (Squid + NetFlow + Syslog)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportWordDoc}
            disabled={!profile}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted Microsoft Word Dossier"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export Word</span>
          </button>

          <Link
            href={`/user/${encodeURIComponent(ip)}`}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Open Dedicated Full Page Profile"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Full Page</span>
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-900/40 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('squid')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'squid'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Sites Visited ({profile?.squid.topDomains.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'flows'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Network Flows ({formatBytes(profile?.softflowd.totalBytes || 0)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('syslog')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'syslog'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Firewall & Syslog ({profile?.syslog.totalEvents || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'edit'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Employee Mapping</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading comprehensive telemetry for {ip}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {!loading && profile && (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* 4 Mini KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-blue-400" /> Web Requests
                    </span>
                    <p className="text-lg font-bold text-white mt-1">
                      {formatNumber(profile.squid.totalRequests)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatBytes(profile.squid.totalBytes)} web volume
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> Web Blocks
                    </span>
                    <p className="text-lg font-bold text-rose-400 mt-1">
                      {formatNumber(profile.squid.blockedCount)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">403 ACL Denials</p>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Server className="w-3 h-3 text-indigo-400" /> NetFlow Traffic
                    </span>
                    <p className="text-lg font-bold text-white mt-1">
                      {formatBytes(profile.softflowd.totalBytes)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatNumber(profile.softflowd.totalFlows)} flows
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-purple-400" /> Firewall Blocks
                    </span>
                    <p className="text-lg font-bold text-purple-400 mt-1">
                      {formatNumber(profile.syslog.firewallBlocks)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {profile.syslog.totalEvents} total syslog
                    </p>
                  </div>
                </div>

                {/* Bandwidth Split */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-200">Layer 3/4 Bandwidth Split</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowDownCircle className="w-3 h-3" /> Down: {formatBytes(profile.softflowd.downloadBytes)}
                      </span>
                      <span className="text-blue-400 flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3" /> Up: {formatBytes(profile.softflowd.uploadBytes)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{
                        width: `${
                          profile.softflowd.totalBytes > 0
                            ? Math.min(100, Math.round((profile.softflowd.downloadBytes / profile.softflowd.totalBytes) * 100))
                            : 50
                        }%`,
                      }}
                      title="Download Ratio"
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${
                          profile.softflowd.totalBytes > 0
                            ? Math.min(100, Math.round((profile.softflowd.uploadBytes / profile.softflowd.totalBytes) * 100))
                            : 50
                        }%`,
                      }}
                      title="Upload Ratio"
                    />
                  </div>
                </div>

                {/* Side-by-side Top Domains and Top Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Domains */}
                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Top Sites Visited (Squid)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('squid')}
                        className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </h3>
                    {profile.squid.topDomains.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">No web proxy activity recorded.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {profile.squid.topDomains.slice(0, 5).map((d) => (
                          <div
                            key={d.domain}
                            className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60 text-xs border border-slate-800/60"
                          >
                            <span className="font-mono text-slate-300 truncate max-w-[160px]">
                              {d.domain}
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-400">{formatNumber(d.requestCount)} reqs</span>
                              <span className="font-semibold text-slate-200">{formatBytes(d.bytes)}</span>
                              {d.blockedCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                  {d.blockedCount} blocked
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Services */}
                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Top Network Protocols (pfSense)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('flows')}
                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </h3>
                    {profile.softflowd.topServices.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">No NetFlow records found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {profile.softflowd.topServices.slice(0, 5).map((s) => (
                          <div
                            key={`${s.serviceName}-${s.dstPort}`}
                            className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60 text-xs border border-slate-800/60"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">{s.serviceName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {s.protocol}/{s.dstPort}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-400">{formatNumber(s.flowCount)} flows</span>
                              <span className="font-semibold text-slate-200">{formatBytes(s.bytes)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SITES VISITED (SQUID PROXY) */}
            {activeTab === 'squid' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Sites Visited & Top Domains ({profile.squid.topDomains.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Total Volume: {formatBytes(profile.squid.totalBytes)}
                  </span>
                </div>

                {profile.squid.topDomains.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No web proxy records found for this host.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Visited Domain</th>
                          <th className="py-2.5 px-3 text-right">Requests</th>
                          <th className="py-2.5 px-3 text-right">Data Transferred</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {profile.squid.topDomains.map((d) => (
                          <tr key={d.domain} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-200">
                              {d.domain}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                              {formatNumber(d.requestCount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                              {formatBytes(d.bytes)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {d.blockedCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                  {d.blockedCount} Blocked
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                                  Allowed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recent Blocked Web Requests */}
                {profile.squid.recentBlocked.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Recent Denied / Blocked Requests (403 ACL)
                    </h4>
                    <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl divide-y divide-rose-500/10 overflow-hidden text-xs">
                      {profile.squid.recentBlocked.map((b) => (
                        <div key={b.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-rose-300 font-mono text-[11px]">{b.method}</span>
                              <span className="text-[10px] text-slate-400">{b.formattedTime}</span>
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 text-[10px] font-mono">
                                {b.resultCode}
                              </span>
                            </div>
                            <p className="text-slate-300 font-mono text-[11px] truncate mt-0.5">
                              {b.url}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(b.url, b.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedUrl === b.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: NETWORK FLOWS (PF SENSE SOFTFLOWD) */}
            {activeTab === 'flows' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Layer 3/4 Network Flow Telemetry
                  </h3>
                  <span className="text-xs text-slate-400">
                    {formatNumber(profile.softflowd.totalFlows)} flows recorded
                  </span>
                </div>

                {/* Top Destinations */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-300">
                    Top Remote Destinations Contacted
                  </div>
                  {profile.softflowd.topDestinations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">No destination telemetry.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase">
                        <tr>
                          <th className="py-2 px-3">Remote IP</th>
                          <th className="py-2 px-3 text-right">Flows</th>
                          <th className="py-2 px-3 text-right">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {profile.softflowd.topDestinations.map((d) => (
                          <tr key={d.dstIp} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-200">{d.dstIp}</td>
                            <td className="py-2 px-3 text-right text-slate-400 font-sans">
                              {formatNumber(d.flowCount)}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-sans font-medium">
                              {formatBytes(d.bytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Recent Flow Records */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent Live Flow Records
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase">
                        <tr>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Direction</th>
                          <th className="py-2 px-3">Remote Endpoint</th>
                          <th className="py-2 px-3">Service</th>
                          <th className="py-2 px-3 text-right">Bytes</th>
                          <th className="py-2 px-3 text-center">Flags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {profile.softflowd.recentFlows.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{f.formattedTime}</td>
                            <td className="py-2 px-3">
                              {f.direction === 'download' ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                  IN
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                  OUT
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-200">{f.remoteIp}:{f.port}</td>
                            <td className="py-2 px-3 text-slate-300 font-sans">{f.serviceName}</td>
                            <td className="py-2 px-3 text-right text-slate-200 font-sans font-medium">{formatBytes(f.bytes)}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{f.tcpFlags}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FIREWALL & SYSLOG */}
            {activeTab === 'syslog' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    pfSense Firewall & Operational Events
                  </h3>
                  <span className="text-xs text-purple-400 font-medium">
                    {profile.syslog.firewallBlocks} Security Drops
                  </span>
                </div>

                {profile.syslog.recentEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No syslog records detected for host {ip}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.syslog.recentEvents.map((e) => (
                      <div
                        key={e.id}
                        className={`p-3 rounded-xl border text-xs ${
                          e.action === 'block' || e.message.toUpperCase().includes('BLOCK')
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{e.appName}</span>
                            <span className="text-[10px] text-slate-400">{e.formattedTime}</span>
                            {e.action && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  e.action === 'block' ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {e.action}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {e.protocol ? `${e.protocol} ` : ''}{e.dstPort ? `Port ${e.dstPort}` : ''}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] leading-relaxed break-words text-slate-300">
                          {e.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: EDIT MAPPING */}
            {activeTab === 'edit' && (
              <form onSubmit={handleSaveMapping} className="space-y-4 max-w-lg">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                  Assign this host IP to an employee and department to track individual workstation telemetry across the NOC.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Host IP Address</label>
                  <input
                    type="text"
                    disabled
                    value={ip}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Employee Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Kasun Fernando"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    placeholder="e.g. Operations, IT, Finance"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Workstation / Device Notes</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Workstation 14, Dell OptiPlex, 2nd floor"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingMapping || !editName.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingMapping ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Mapping</span>
                      </>
                    )}
                  </button>

                  {saveSuccess && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Saved successfully!
                    </span>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
