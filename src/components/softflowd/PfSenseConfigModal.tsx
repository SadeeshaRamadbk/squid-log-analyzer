'use client';

import React, { useState } from 'react';
import { X, Shield, Check, Copy, Terminal } from 'lucide-react';

interface PfSenseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PfSenseConfigModal({ isOpen, onClose }: PfSenseConfigModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const firewallCmd = 'New-NetFirewallRule -DisplayName "NetFlow UDP Collector" -Direction Inbound -LocalPort 2055 -Protocol UDP -Action Allow';
  const collectorCmd = 'npm run netflow';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                pfSense softflowd 1.2.6_4 Configuration Guide
              </h2>
              <p className="text-xs text-slate-400">
                Configure NetFlow v5 export from pfSense router to this analyzer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* Windows Firewall Setup Step */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-amber-300 text-xs uppercase tracking-wide">
                  Step 1: Allow Windows Firewall Port (Run in Admin PowerShell)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(firewallCmd, 'firewall')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors cursor-pointer"
              >
                {copiedKey === 'firewall' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Windows blocks incoming UDP packets by default. Open an Administrator PowerShell and run:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-amber-200 select-all overflow-x-auto break-all">
              {firewallCmd}
            </div>
          </div>

          {/* pfSense Package Install */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Step 2: Install Package on pfSense
            </h3>
            <p className="text-slate-400">
              In pfSense web GUI, navigate to <strong className="text-slate-200">System &gt; Package Manager &gt; Available Packages</strong>. Search for <strong className="text-slate-200">softflowd</strong> (version <code className="text-indigo-300 font-mono">1.2.6_4</code>) and click <strong className="text-slate-200">Install</strong>.
            </p>
          </div>

          {/* pfSense softflowd Settings */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Step 3: Configure softflowd Settings in pfSense
            </h3>
            <p className="text-slate-400">
              Navigate to <strong className="text-slate-200">Services &gt; softflowd</strong> and enter the following settings:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] space-y-2.5">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Interface:</span>
                <span className="text-emerald-400 font-semibold">LAN, WAN (or all desired interfaces)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Host:</span>
                <span className="text-amber-300 font-semibold">&lt;IP of this PC / Server, e.g. 192.168.0.141&gt;</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Port:</span>
                <span className="text-amber-300 font-semibold">2055</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Max Flows:</span>
                <span className="text-slate-200">8192 (or 16384)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Hop Limit:</span>
                <span className="text-slate-200">64</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Sampling Rate:</span>
                <span className="text-slate-200">1 (1:1 full capture) or 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NetFlow version:</span>
                <span className="text-emerald-400 font-bold">5</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Click <strong className="text-slate-300">Save</strong> at the bottom of the pfSense page to apply changes.
            </p>
          </div>

          {/* Start Collector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Step 4: Start NetFlow Collector Daemon
              </h3>
              <button
                type="button"
                onClick={() => handleCopy(collectorCmd, 'collector')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 transition-colors cursor-pointer"
              >
                {copiedKey === 'collector' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-400">
              Run this in your terminal on this machine to start receiving and storing live flows:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-emerald-400 text-xs">
              {collectorCmd}
            </div>
            <p className="text-slate-500 text-[11px]">
              Incoming flows will automatically batch-insert into SQLite WAL storage and update the dashboard in real-time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
