'use client';

import React, { useState } from 'react';
import { X, Network, Check, Copy, Terminal, Server, FileText } from 'lucide-react';

interface SquidConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SquidConfigModal({ isOpen, onClose }: SquidConfigModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const rsyslogSnippet = `# /etc/rsyslog.d/40-squid.conf
# Forward Squid access logs to Windows host or central collector
$ModLoad imfile
$InputFileName /var/log/squid/access.log
$InputFileTag squid-access:
$InputFileStateFile stat-squid-access
$InputFileSeverity info
$InputFileFacility local5
$InputRunFileMonitor
local5.* @<WINDOWS_ANALYZER_IP>:514`;

  const sshTailCmd = `npm run ingest`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Squid Proxy Log Ingestion Setup
              </h2>
              <p className="text-xs text-slate-400">
                Forward or stream Squid access logs to this analyzer in real-time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* Method A: SSH Live Stream Ingestion */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-blue-300 text-xs uppercase tracking-wide">
                  Method 1: SSH Remote Tailer (Recommended)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(sshTailCmd, 'tailer')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {copiedKey === 'tailer' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'tailer' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-slate-400">
              Configure SSH credentials in <code className="text-amber-300">.env.local</code> (or run directly on the pfSense/Squid host). The built-in SSH tailer continuously streams and parses incoming access logs directly into SQLite.
            </p>
            <pre className="p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-200">
              {sshTailCmd}
            </pre>
          </div>

          {/* Method B: Rsyslog / Syslog Forwarding */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-indigo-300 text-xs uppercase tracking-wide">
                  Method 2: Syslog Log Forwarding
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(rsyslogSnippet, 'rsyslog')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {copiedKey === 'rsyslog' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'rsyslog' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-slate-400">
              On pfSense or the Linux Squid proxy server, append this rsyslog rule to forward access log lines:
            </p>
            <pre className="p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
              {rsyslogSnippet}
            </pre>
          </div>

          {/* pfSense Squid Package Settings */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-emerald-300 text-xs uppercase tracking-wide">
                pfSense Squid Package Configuration
              </span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400">
              <li>Log Format: Standard Squid access log format (<code className="text-slate-200">squid</code> native).</li>
              <li>Log Location: Default pfSense path is <code className="text-slate-200">/var/squid/logs/access.log</code>.</li>
              <li>Privacy: Privacy protection strips URLs for allowed traffic while retaining full URLs for blocked (<code className="text-slate-200">TCP_DENIED/403</code>) requests.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
