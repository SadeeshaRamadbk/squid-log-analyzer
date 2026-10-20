'use client';

import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface BlockDomainModalProps {
  domain: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BlockDomainModal({ domain, isOpen, onClose, onSuccess }: BlockDomainModalProps) {
  const [reason, setReason] = useState('Malicious / Unproductive Domain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !domain) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_domain',
          target: domain,
          reason,
          operator: 'admin',
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSuccess?.();
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Block Domain</h3>
              <p className="text-xs text-slate-400">Add domain to proxy blocklist policy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Domain</span>
          <p className="text-sm font-bold text-slate-100 font-mono break-all">{domain}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Reason / Category</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
            placeholder="e.g., Gambling, Phishing, Streaming"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {error}
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
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Blocking...' : 'Confirm Block'}
          </button>
        </div>
      </div>
    </div>
  );
}
