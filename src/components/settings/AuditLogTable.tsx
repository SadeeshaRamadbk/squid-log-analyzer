'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, RefreshCw, Filter, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuditEntry } from '@/lib/audit';

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchActor, setSearchActor] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAction !== 'all') params.set('action', filterAction);
      if (searchActor.trim()) params.set('actor', searchActor.trim());
      params.set('limit', String(pageSize));
      params.set('offset', String((page - 1) * pageSize));

      const res = await fetch(`/api/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filterAction, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'logout':
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
      case 'alias_edit':
      case 'alias_delete':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'block_rule':
      case 'unblock_rule':
        return 'bg-rose-500/10 text-rose-300 border-rose-800';
      case 'report_gen':
      case 'report_email':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'timeline_view':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            System Audit Log & Operator Accountability
          </h3>
          <p className="text-xs text-slate-400">
            Immutable tracking of logins, workstation alias updates, firewall block actions, and timeline dossier views
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={searchActor}
              onChange={(e) => setSearchActor(e.target.value)}
              placeholder="Filter by actor..."
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              Filter
            </button>
          </form>

          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="login">Logins</option>
            <option value="logout">Logouts</option>
            <option value="alias_edit">Alias Edits</option>
            <option value="alias_delete">Alias Deletions</option>
            <option value="block_rule">Block Rules</option>
            <option value="unblock_rule">Unblock Rules</option>
            <option value="report_gen">Report Generations</option>
            <option value="report_email">Email Dispatches</option>
            <option value="timeline_view">Timeline Dossier Views</option>
          </select>

          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh audit logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto">
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No audit events recorded under this filter.</div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans font-medium text-[11px]">
                <th className="pb-2.5 pl-1">Timestamp</th>
                <th className="pb-2.5">Operator (Actor)</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Target</th>
                <th className="pb-2.5">Details</th>
                <th className="pb-2.5 text-right pr-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 pl-1 whitespace-nowrap text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}
                  </td>
                  <td className="py-2.5 font-sans font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-purple-400" />
                      <span>{log.actor}</span>
                      {log.ip_address && (
                        <span className="text-[10px] text-slate-500 font-mono">({log.ip_address})</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 font-sans text-slate-200 max-w-[200px] truncate" title={log.target || ''}>
                    {log.target || '-'}
                  </td>
                  <td className="py-2.5 font-sans text-slate-400 max-w-[260px] truncate text-[11px]" title={log.details || ''}>
                    {log.details || '-'}
                  </td>
                  <td className="py-2.5 text-right pr-1 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-sans font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-sans font-medium">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Showing {((page - 1) * pageSize + 1).toLocaleString()} to{' '}
            {Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()} entries
          </span>
          <div className="flex items-center gap-1.5 font-sans">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer text-xs"
            >
              Previous
            </button>
            <span className="text-slate-300 text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
