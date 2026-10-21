'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building,
  Globe,
  Server,
  ShieldAlert,
  Clock,
  Download,
  Activity,
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { IpProfileData } from '@/lib/db/profile-queries';
import { maskEmployeeName } from '@/lib/privacy';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export default function UserDetailPage({ params }: { params: Promise<{ ip: string }> }) {
  const resolvedParams = use(params);
  const userIp = decodeURIComponent(resolvedParams.ip);

  const [profile, setProfile] = useState<IpProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'squid' | 'flows' | 'syslog'>('all');
  const isPrivacyMode = usePrivacyMode();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/profile?ip=${encodeURIComponent(userIp)}`);
      const json = await res.json();
      if (json.success) {
        setProfile(json.profile);
      } else {
        setError(json.error || 'Failed to fetch user dossier');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [userIp]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Export User Dossier to Microsoft Word (.doc)
  const handleExportWordDoc = () => {
    if (!profile) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>User Dossier: ${profile.mapping.userName || profile.clientIp}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 40px; color: #222; }
          h1 { color: #1e3a8a; font-size: 24pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
          h2 { color: #1e40af; font-size: 16pt; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .badge { background-color: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
          .metric-box { display: inline-block; width: 30%; border: 1px solid #cbd5e1; padding: 12px; margin-right: 2%; background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Employee Network Telemetry Dossier</h1>
        <p><strong>Target IP:</strong> ${profile.clientIp} | <strong>Employee:</strong> ${profile.mapping.userName || 'Unassigned'} | <strong>Department:</strong> ${profile.mapping.department || 'N/A'}</p>
        <p><strong>Generated At:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} (Asia/Colombo UTC+5:30)</p>
        
        <h2>Activity Overview</h2>
        <table>
          <tr><th>Metric</th><th>Squid Proxy (L7)</th><th>pfSense softflowd (L3/L4)</th></tr>
          <tr><td>Total Volume / Flows</td><td>${formatNumber(profile.squid.totalRequests)} requests (${formatBytes(profile.squid.totalBytes)})</td><td>${formatNumber(profile.softflowd.totalFlows)} flows (${formatBytes(profile.softflowd.totalBytes)})</td></tr>
          <tr><td>Download Bandwidth</td><td>-</td><td>${formatBytes(profile.softflowd.downloadBytes)}</td></tr>
          <tr><td>Upload Bandwidth</td><td>-</td><td>${formatBytes(profile.softflowd.uploadBytes)}</td></tr>
          <tr><td>Security Blocks</td><td><span class="badge">${formatNumber(profile.squid.blockedCount)} blocked attempts</span></td><td>0 drops</td></tr>
        </table>

        <h2>Top Requested Web Domains</h2>
        <table>
          <tr><th>Domain</th><th>Requests</th><th>Volume</th><th>Blocked</th></tr>
          ${profile.squid.topDomains.slice(0, 15).map(d => `
            <tr>
              <td>${d.domain}</td>
              <td>${formatNumber(d.requestCount)}</td>
              <td>${formatBytes(d.bytes)}</td>
              <td>${d.blockedCount > 0 ? `<span class="badge">${d.blockedCount}</span>` : '0'}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Top Remote Destinations & Services</h2>
        <table>
          <tr><th>Destination IP</th><th>Service / Port</th><th>Volume</th><th>Flows</th></tr>
          ${profile.softflowd.topDestinations.slice(0, 10).map((d, i) => {
            const svc = profile.softflowd.topServices[i];
            return `
              <tr>
                <td>${d.dstIp}</td>
                <td>${svc ? `${svc.serviceName} (${svc.dstPort}/${svc.protocol})` : 'Other'}</td>
                <td>${formatBytes(d.bytes)}</td>
                <td>${formatNumber(d.flowCount)}</td>
              </tr>
            `;
          }).join('')}
        </table>

        <h2>Security Violation Timeline (Recent Blocked URLs)</h2>
        <table>
          <tr><th>Timestamp</th><th>Method</th><th>Domain</th><th>Result Code</th></tr>
          ${profile.squid.recentBlocked.slice(0, 20).map(b => `
            <tr>
              <td>${b.formattedTime}</td>
              <td>${b.method}</td>
              <td>${b.domain}</td>
              <td><span class="badge">${b.resultCode}</span></td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `User_Report_${profile.clientIp}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Activity className="w-5 h-5 animate-spin text-indigo-400" />
          Loading user network dossier for {userIp}...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <p className="text-rose-400 text-sm">{error || 'Host profile not found'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Combined timeline items
  const timelineItems: Array<{
    time: number;
    formatted: string;
    type: 'squid' | 'flow' | 'syslog';
    title: string;
    subtitle: string;
    badge: string;
    isAlert?: boolean;
  }> = [];

  for (const b of profile.squid.recentBlocked) {
    timelineItems.push({
      time: b.timestamp,
      formatted: b.formattedTime,
      type: 'squid',
      title: `Blocked HTTP/S: ${b.domain}`,
      subtitle: b.url || b.resultCode,
      badge: `SQUID ${b.resultCode}`,
      isAlert: true,
    });
  }

  for (const f of profile.softflowd.recentFlows) {
    timelineItems.push({
      time: f.timestamp,
      formatted: f.formattedTime,
      type: 'flow',
      title: `${f.serviceName} Flow: ${f.direction === 'upload' ? 'Upload to' : 'Download from'} ${f.remoteIp}`,
      subtitle: `${formatBytes(f.bytes)} (${f.packets} packets, ${f.protocol})`,
      badge: `NETFLOW ${f.serviceName}`,
      isAlert: false,
    });
  }

  if (profile.syslog?.recentEvents) {
    for (const s of profile.syslog.recentEvents) {
      const isBlock = s.action === 'block' || s.action === 'reject' || (s.appName === 'filterlog' && s.message.toUpperCase().includes('BLOCK'));
      timelineItems.push({
        time: s.timestamp,
        formatted: s.formattedTime,
        type: 'syslog',
        title: `${isBlock ? 'Firewall Drop' : 'Syslog Event'} (${s.appName}): ${s.protocol || ''} ${s.srcIp || ''} -> ${s.dstIp || ''}${s.dstPort ? `:${s.dstPort}` : ''}`,
        subtitle: s.message,
        badge: isBlock ? 'FIREWALL BLOCK' : `SYSLOG ${s.severityLabel.toUpperCase()}`,
        isAlert: isBlock || s.severity <= 4,
      });
    }
  }

  timelineItems.sort((a, b) => b.time - a.time);

  const filteredTimeline = timelineItems.filter((item) => {
    if (timelineFilter === 'squid') return item.type === 'squid';
    if (timelineFilter === 'flows') return item.type === 'flow';
    if (timelineFilter === 'syslog') return item.type === 'syslog';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Return to NOC Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                User Telemetry Dossier: {profile.mapping.userName ? maskEmployeeName(profile.mapping.userName, isPrivacyMode) : profile.clientIp}
              </h1>
              <p className="text-xs text-slate-400 font-mono">{profile.clientIp}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportWordDoc}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Word Report (.doc)
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* User Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {profile.mapping.userName ? maskEmployeeName(profile.mapping.userName, isPrivacyMode) : 'Unassigned Host'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                  {profile.clientIp}
                </span>
                {profile.mapping.department && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    {profile.mapping.department}
                  </span>
                )}
                {profile.mapping.notes && (
                  <span className="text-slate-500 italic truncate max-w-xs">{profile.mapping.notes}</span>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Chips */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center min-w-24">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Requests</span>
              <p className="text-sm font-bold text-slate-100 font-mono">
                {formatNumber(profile.squid.totalRequests)}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center min-w-24">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">NetFlow Vol</span>
              <p className="text-sm font-bold text-blue-400 font-mono">
                {formatBytes(profile.softflowd.totalBytes)}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center min-w-24">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Download ⬇️</span>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {formatBytes(profile.softflowd.downloadBytes)}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center min-w-24">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Upload ⬆️</span>
              <p className="text-sm font-bold text-purple-400 font-mono">
                {formatBytes(profile.softflowd.uploadBytes)}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-900/40 text-center min-w-24">
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Blocked 🚫</span>
              <p className="text-sm font-bold text-rose-400 font-mono">
                {formatNumber(profile.squid.blockedCount)}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-900/40 text-center min-w-24">
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Firewall Drops</span>
              <p className="text-sm font-bold text-amber-400 font-mono">
                {formatNumber(profile.syslog?.firewallBlocks || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Squid Domains vs softflowd Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Squid Domains */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Top Web Domains (HTTP/S)
            </h3>
            <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto text-xs">
              {profile.squid.topDomains.map((d) => (
                <div key={d.domain} className="py-2 flex items-center justify-between gap-2">
                  <span className="truncate text-slate-200 font-medium">{d.domain}</span>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                    <span className="text-slate-400">{formatBytes(d.bytes)}</span>
                    <span className="text-slate-300 font-semibold">{formatNumber(d.requestCount)} reqs</span>
                    {d.blockedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                        {d.blockedCount} blk
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Network Destinations & Services */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Top Remote Endpoints & Services
            </h3>
            <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto text-xs">
              {profile.softflowd.topDestinations.map((d) => (
                <div key={d.dstIp} className="py-2 flex items-center justify-between gap-2">
                  <span className="truncate text-slate-200 font-mono">{d.dstIp}</span>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                    <span className="text-slate-400">{formatBytes(d.bytes)}</span>
                    <span className="text-cyan-400 font-semibold">{formatNumber(d.flowCount)} flows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Interactive Activity Timeline
            </h3>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTimelineFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timelineFilter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                All Events ({timelineItems.length})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('squid')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timelineFilter === 'squid' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Proxy Blocks
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('flows')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timelineFilter === 'flows' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Flows
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('syslog')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timelineFilter === 'syslog' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Firewall / Syslog ({profile.syslog?.recentEvents?.length || 0})
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto space-y-1">
            {filteredTimeline.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      item.isAlert
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-indigo-400'
                    }`}
                  >
                    {item.isAlert ? <ShieldAlert className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">{item.title}</span>
                    <p className="text-slate-400 text-[11px] font-mono mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-500">{item.formatted}</span>
                  <div className="mt-0.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.isAlert
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
