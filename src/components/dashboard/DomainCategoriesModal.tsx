'use client';

import React, { useState, useEffect } from 'react';
import {
  Tags,
  X,
  Search,
  Plus,
  Trash2,
  Building,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Tv,
  Share2,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { formatNumber, formatBytes } from '@/lib/formatters';
import type { DomainCategory, DepartmentCategoryBreakdown } from '@/lib/categories';
import { useAuth } from '@/components/auth/AuthContext';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface DomainCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DomainCategoriesModal({ isOpen, onClose }: DomainCategoriesModalProps) {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'departments'>('departments');

  // Rules State
  const [categoriesMap, setCategoriesMap] = useState<Record<string, DomainCategory>>({});
  const [search, setSearch] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newCategory, setNewCategory] = useState<DomainCategory>('Work');
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleMsg, setRuleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Department Summary State
  const [departments, setDepartments] = useState<DepartmentCategoryBreakdown[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoadingRules(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && data.categories) {
        setCategoriesMap(data.categories);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchDepartmentSummary = async () => {
    try {
      setLoadingDepts(true);
      const res = await fetch('/api/categories?mode=departments');
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingDepts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchDepartmentSummary();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setRuleMsg(null);
    try {
      setSavingRule(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.trim().toLowerCase(),
          category: newCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRuleMsg({ type: 'success', text: `Saved rule: ${newDomain.trim()} -> ${newCategory}` });
        setNewDomain('');
        fetchCategories();
        fetchDepartmentSummary();
      } else {
        setRuleMsg({ type: 'error', text: data.error || 'Failed to save rule' });
      }
    } catch (err: any) {
      setRuleMsg({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (domain: string) => {
    if (!confirm(`Reset category rule for "${domain}"?`)) return;

    setRuleMsg(null);
    try {
      const res = await fetch(`/api/categories?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setRuleMsg({ type: 'success', text: `Reset rule for ${domain}` });
        fetchCategories();
        fetchDepartmentSummary();
      } else {
        setRuleMsg({ type: 'error', text: data.error || 'Failed to reset rule' });
      }
    } catch (err: any) {
      setRuleMsg({ type: 'error', text: err.message || 'Network error' });
    }
  };

  const filteredEntries = Object.entries(categoriesMap).filter(
    ([dom, cat]) =>
      dom.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryBadgeClass = (cat: DomainCategory) => {
    switch (cat) {
      case 'Work':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Streaming':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Social':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'Ads/Telemetry/CDN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  const modalRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-cat-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 id="domain-cat-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Domain Categories &amp; Department Usage</span>
              </h2>
              <p className="text-xs text-slate-400">
                Classify web traffic into Work, Streaming, Social, Ads/Telemetry/CDN, and Other
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close domain categories dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'departments'
                ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Per-Department Usage Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'rules'
                ? 'border-purple-500 text-purple-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tags className="w-3.5 h-3.5" />
            <span>Editable Domain Rules ({Object.keys(categoriesMap).length})</span>
          </button>
        </div>

        {/* Feedback Message */}
        {ruleMsg && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl border flex items-center gap-2 text-xs ${
              ruleMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {ruleMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{ruleMsg.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: Department Usage Summary */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  Aggregated HTTP/S proxy traffic grouped by department and classified by domain category.
                </p>
                <button
                  type="button"
                  onClick={fetchDepartmentSummary}
                  disabled={loadingDepts}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 self-start cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingDepts ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingDepts && departments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                  <span>Calculating department breakdown...</span>
                </div>
              ) : departments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No department telemetry recorded yet. Assign IP addresses to departments in IP Aliases.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3 text-right">Total Requests</th>
                        <th className="py-3 px-3 text-right">Volume</th>
                        <th className="py-3 px-3 text-center">Category Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {departments.map((dept) => (
                        <tr key={dept.department} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{dept.department}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                            {formatNumber(dept.totalRequests)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {formatBytes(dept.totalBytes)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1 max-w-md mx-auto">
                              {/* Stacked bar */}
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                                {dept.workPercentage > 0 && (
                                  <div
                                    style={{ width: `${dept.workPercentage}%` }}
                                    className="bg-blue-500 h-full"
                                    title={`Work: ${dept.workPercentage}%`}
                                  />
                                )}
                                {dept.streamingPercentage > 0 && (
                                  <div
                                    style={{ width: `${dept.streamingPercentage}%` }}
                                    className="bg-purple-500 h-full"
                                    title={`Streaming: ${dept.streamingPercentage}%`}
                                  />
                                )}
                                {dept.socialPercentage > 0 && (
                                  <div
                                    style={{ width: `${dept.socialPercentage}%` }}
                                    className="bg-pink-500 h-full"
                                    title={`Social: ${dept.socialPercentage}%`}
                                  />
                                )}
                                {dept.adsPercentage > 0 && (
                                  <div
                                    style={{ width: `${dept.adsPercentage}%` }}
                                    className="bg-amber-500 h-full"
                                    title={`Ads/Telemetry: ${dept.adsPercentage}%`}
                                  />
                                )}
                                {dept.otherPercentage > 0 && (
                                  <div
                                    style={{ width: `${dept.otherPercentage}%` }}
                                    className="bg-slate-600 h-full"
                                    title={`Other: ${dept.otherPercentage}%`}
                                  />
                                )}
                              </div>
                              {/* Badges */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span className="text-blue-400">Work {dept.workPercentage}%</span>
                                <span className="text-purple-400">Stream {dept.streamingPercentage}%</span>
                                <span className="text-pink-400">Social {dept.socialPercentage}%</span>
                                <span className="text-amber-400">Ads {dept.adsPercentage}%</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Editable Domain Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Add Custom Rule Form */}
              {isAdmin && (
                <form
                  onSubmit={handleSaveRule}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-end gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <label htmlFor="new-domain-input" className="text-[11px] font-semibold text-slate-300">
                      Domain Name (e.g. reddit.com or *.subdomain)
                    </label>
                    <input
                      id="new-domain-input"
                      type="text"
                      placeholder="e.g. example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-48 space-y-1">
                    <label htmlFor="new-cat-select" className="text-[11px] font-semibold text-slate-300">Category</label>
                    <select
                      id="new-cat-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as DomainCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="Work">Work</option>
                      <option value="Streaming">Streaming</option>
                      <option value="Social">Social</option>
                      <option value="Ads/Telemetry/CDN">Ads/Telemetry/CDN</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={savingRule || !newDomain.trim()}
                    className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Rule</span>
                  </button>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <label htmlFor="search-domain-rules" className="sr-only">Search categorized domains</label>
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  id="search-domain-rules"
                  type="text"
                  placeholder="Search categorized domains or categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Rules List */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Domain category classification rules</caption>
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold sticky top-0 z-10">
                      <th scope="col" className="py-2.5 px-3">Domain</th>
                      <th scope="col" className="py-2.5 px-3">Canonical Category</th>
                      {isAdmin && <th scope="col" className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredEntries.slice(0, 100).map(([dom, cat]) => (
                      <tr key={dom} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-slate-200">{dom}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadgeClass(
                              cat
                            )}`}
                          >
                            {cat}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(dom)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Reset rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
