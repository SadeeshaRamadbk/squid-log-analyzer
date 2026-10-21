'use client';

import React, { useState } from 'react';
import { X, Shield, Check, Copy, Terminal, ExternalLink, AlertTriangle, Network, Info } from 'lucide-react';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface PfSenseSyslogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PfSenseSyslogModal({ isOpen, onClose }: PfSenseSyslogModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modalRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const firewallCmd = 'New-NetFirewallRule -DisplayName "pfSense Syslog UDP Collector" -Direction Inbound -LocalPort 1514 -Protocol UDP -Action Allow';
  const collectorCmd = 'npm run syslog';
  const squidSyslogLine = 'access_log syslog:local0.info';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pfsense-syslog-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] focus:outline-none"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="pfsense-syslog-modal-title" className="text-base font-semibold text-white">
                pfSense Syslog Forwarding Setup Guide
              </h2>
              <p className="text-xs text-slate-400">
                Forward pfSense firewall, daemon, and Squid operational logs to this analyzer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pfSense syslog setup guide dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 flex items-start gap-2.5 text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <div className="space-y-1">
              <span className="font-semibold text-white">Agentless UDP Push (Port 1514)</span>
              <p className="text-[11px] leading-relaxed text-blue-200">
                pfSense will push logs directly across the local network over standard UDP. No SSH credentials or agent installs are required on the firewall.
              </p>
            </div>
          </div>

          {/* Step 1: Start Syslog Collector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-mono">
                1
              </span>
              <span>Start the Syslog UDP Collector on this Analyzer</span>
            </div>
            <p className="text-slate-400 pl-7 text-[11px]">
              Run the collector service in a background terminal. It listens on UDP port <code className="text-indigo-300">1514</code> and batches logs into SQLite.
            </p>
            <div className="pl-7">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300">
                <span>{collectorCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(collectorCmd, 'collector')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedKey === 'collector' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Open Windows Firewall */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-mono">
                2
              </span>
              <span>Allow UDP Port 1514 in Windows Firewall (Run once as Admin)</span>
            </div>
            <p className="text-slate-400 pl-7 text-[11px]">
              If this analyzer runs on Windows, execute this PowerShell command to allow inbound Syslog packets from pfSense:
            </p>
            <div className="pl-7">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300">
                <span className="truncate pr-2">{firewallCmd}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(firewallCmd, 'firewall')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedKey === 'firewall' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Configure pfSense Remote Logging */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-mono">
                3
              </span>
              <span>Enable Remote Syslog in pfSense WebGUI</span>
            </div>
            <div className="pl-7 space-y-2 text-slate-300">
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                <li>Log in to pfSense WebGUI at <code className="text-indigo-300">https://192.168.0.1</code>.</li>
                <li>Go to <strong className="text-white">Status &gt; System Logs</strong>, then click the <strong className="text-white">Settings</strong> tab.</li>
                <li>Scroll down to <strong className="text-white">Remote Logging Options</strong>.</li>
                <li>Check <strong className="text-indigo-300">Enable Remote Logging</strong>.</li>
                <li>
                  In <strong className="text-white">Remote log servers</strong>, enter your analyzer IP address with port:
                  <div className="mt-1 p-2 rounded bg-slate-950 font-mono text-cyan-300 border border-slate-800">
                    &lt;this-computer-ip&gt;:1514
                  </div>
                </li>
                <li>
                  Under <strong className="text-white">Remote Syslog Contents</strong>, select the logs you want to forward:
                  <ul className="list-disc list-inside pl-3 pt-1 space-y-0.5 text-slate-400">
                    <li><strong className="text-slate-200">System Events</strong> (Squid proxy errors, daemon alerts, DNS issues)</li>
                    <li><strong className="text-slate-200">Firewall Events</strong> (Blocked port probes, filterlog)</li>
                    <li><strong className="text-slate-200">DHCP Service Events</strong> (Device leases and IP renewals)</li>
                    <li><strong className="text-slate-200">Gateway Monitor</strong> (dpinger packet loss / latency alerts)</li>
                  </ul>
                </li>
                <li>Click <strong className="text-emerald-400 font-semibold">Save</strong> at the bottom.</li>
              </ol>
            </div>
          </div>

          {/* Step 4: Squid cache.log forwarding */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Network className="w-4 h-4 text-blue-400" />
              <span>Forwarding Squid Operational Events</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              pfSense automatically writes Squid cache and daemon errors into the System log facility. If you also wish to mirror access events over Syslog, add <code className="text-blue-300 font-mono">{squidSyslogLine}</code> in <strong>Services &gt; Squid Proxy &gt; Custom Options</strong>.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Listening default: UDP 0.0.0.0:1514
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
