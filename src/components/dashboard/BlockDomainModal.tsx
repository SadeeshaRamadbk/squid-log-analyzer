'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, CheckCircle2, Server, FileText } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface BlockDomainModalProps {
  domain: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BlockDomainModal({ domain, isOpen, onClose, onSuccess }: BlockDomainModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('Malicious / Unproductive Domain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const modalRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen || !domain) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncSuccess(null);

      const res = await fetch('/api/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_domain',
          target: domain,
          reason,
          operator: user?.username || 'admin',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSyncSuccess(`Domain written to Squid ACL & pfSense alias. Audit entry recorded.`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(json.error || 'Failed to block domain');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-domain-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 focus:outline-none"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="block-domain-title" className="text-base font-bold text-slate-100">Confirm Policy Block</h2>
              <p className="text-xs text-slate-400">Enforce proxy ACL &amp; firewall alias blocklist</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close policy block dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Domain</span>
          <p className="text-sm font-bold text-rose-300 font-mono break-all">{domain}</p>
          <p className="text-[11px] text-slate-400">
            Blocks all HTTP and CONNECT SSL tunnels matching <span className="font-mono text-slate-300">.{domain}</span> across all LAN workstations.
          </p>
        </div>

        {/* Adapter Targets */}
        <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adapter Write Targets:</span>
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono text-[11px]">data/squid_blocked_domains.acl</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-mono text-[11px]">data/pfsense_blocked_hosts.txt</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="block-policy-reason" className="text-xs font-semibold text-slate-300">Policy Reason / Audit Note</label>
          <input
            id="block-policy-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "block-policy-error" : undefined}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
            placeholder="e.g., Gambling, Phishing, Streaming, Unproductive"
          />
        </div>

        {error && (
          <div id="block-policy-error" role="alert" className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {syncSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !!syncSuccess}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Writing to ACL...' : 'Confirm Block & Log Audit'}
          </button>
        </div>
      </div>
    </div>
  );
}
