'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit2, Check, User, Search, AlertCircle, ArrowRight } from 'lucide-react';

export interface IpMappingItem {
  clientIp: string;
  userName: string;
  department?: string | null;
  notes?: string | null;
  updatedAt: number;
}

export interface UnassignedIpItem {
  clientIp: string;
  lastSeen: number;
  formattedLastSeen: string;
  logSource: string;
}

interface IpMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingsChanged: () => void;
  initialIp?: string;
}

export function IpMappingModal({
  isOpen,
  onClose,
  onMappingsChanged,
  initialIp,
}: IpMappingModalProps) {
  const [mappings, setMappings] = useState<IpMappingItem[]>([]);
  const [unassignedIps, setUnassignedIps] = useState<UnassignedIpItem[]>([]);
  const [activeTab, setActiveTab] = useState<'mappings' | 'unassigned'>('mappings');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [clientIp, setClientIp] = useState(initialIp || '');
  const [userName, setUserName] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialIp) {
      setClientIp(initialIp);
    }
  }, [initialIp]);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ip-mappings');
      const json = await res.json();
      if (json.success) {
        setMappings(json.data || []);
        setUnassignedIps(json.unassignedIps || []);
      }
    } catch {
      setError('Failed to fetch IP mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMappings();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIp.trim() || !userName.trim()) {
      setError('Both Client IP and User Name are required');
      return;
    }

    setError(null);
    try {
      const res = await fetch('/api/ip-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIp: clientIp.trim(),
          userName: userName.trim(),
          department: department.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Saved alias for ${clientIp}`);
        setClientIp('');
        setUserName('');
        setDepartment('');
        setNotes('');
        setIsEditing(false);
        await fetchMappings();
        onMappingsChanged();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.error || 'Failed to save mapping');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving mapping');
    }
  };

  const handleEdit = (item: IpMappingItem) => {
    setClientIp(item.clientIp);
    setUserName(item.userName);
    setDepartment(item.department || '');
    setNotes(item.notes || '');
    setIsEditing(true);
    setActiveTab('mappings');
  };

  const handleAssignUnassigned = (ip: string) => {
    setClientIp(ip);
    setIsEditing(false);
    setUserName('');
    setDepartment('');
    setNotes('');
    setActiveTab('mappings');
  };

  const handleDelete = async (ipToDelete: string) => {
    if (!confirm(`Are you sure you want to remove user mapping for ${ipToDelete}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ip-mappings?clientIp=${encodeURIComponent(ipToDelete)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Removed mapping for ${ipToDelete}`);
        await fetchMappings();
        onMappingsChanged();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.error || 'Failed to delete');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting mapping');
    }
  };

  const filtered = mappings.filter(
    (m) =>
      m.clientIp.toLowerCase().includes(search.toLowerCase()) ||
      m.userName.toLowerCase().includes(search.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredUnassigned = unassignedIps.filter((u) =>
    u.clientIp.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">IP User Name Mappings</h2>
              <p className="text-xs text-slate-400">
                Assign internal usernames and departments to nipponbpo.local IP addresses
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notifications */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form to Add / Edit */}
          <form onSubmit={handleSave} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isEditing ? 'Edit User Mapping' : 'Assign New IP Alias'}
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setClientIp('');
                    setUserName('');
                    setDepartment('');
                    setNotes('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Internal Client IP *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.0.40"
                  value={clientIp}
                  onChange={(e) => setClientIp(e.target.value)}
                  disabled={isEditing}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Employee / User Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kenji Sato"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finance & Billing"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Notes / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Floor 3, Desk 12"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {isEditing ? 'Update Mapping' : 'Save IP Mapping'}
              </button>
            </div>
          </form>

          {/* Tab Navigation: Configured vs Unassigned */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('mappings')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'mappings'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Configured Aliases ({mappings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unassigned')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'unassigned'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Unassigned Active LAN IPs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-mono">
                  {unassignedIps.length}
                </span>
              </button>
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Table Area */}
          {activeTab === 'mappings' ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading LAN host aliases...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {mappings.length === 0
                    ? 'No IP mappings configured yet. Use the form above to name your first IP.'
                    : 'No mappings match your search query.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 font-medium">
                      <th className="py-2.5 px-3">Client IP</th>
                      <th className="py-2.5 px-3">User Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filtered.map((item) => (
                      <tr key={item.clientIp} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-amber-300 font-medium">
                          {item.clientIp}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-100">
                          {item.userName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {item.department ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {item.department}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {item.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.clientIp)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {filteredUnassigned.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {unassignedIps.length === 0
                    ? 'All active internal endpoints have assigned aliases!'
                    : 'No unassigned IPs match your search query.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 font-medium">
                      <th className="py-2.5 px-3">Unassigned Internal IP</th>
                      <th className="py-2.5 px-3">Traffic Source</th>
                      <th className="py-2.5 px-3">Last Active</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUnassigned.map((item) => (
                      <tr key={item.clientIp} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-cyan-300 font-semibold">
                          {item.clientIp}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {item.logSource}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {item.formattedLastSeen}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleAssignUnassigned(item.clientIp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                          >
                            <span>Assign</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
