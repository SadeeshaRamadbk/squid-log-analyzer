'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, ChevronDown, Check, Trash2, Plus, Star } from 'lucide-react';
import type { GlobalFilterState } from './GlobalFilterBar';

export interface SavedViewItem {
  id: string;
  name: string;
  isPreset?: boolean;
  view?: 'squid' | 'softflowd' | 'split';
  filters: GlobalFilterState;
}

const getPresets = (): SavedViewItem[] => {
  const today = new Date().toISOString().split('T')[0];
  const past7d = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'preset-today',
      name: "Today's Activity",
      isPreset: true,
      view: 'squid',
      filters: {
        startDate: today,
        endDate: today,
        trafficType: 'all',
      },
    },
    {
      id: 'preset-threats',
      name: 'Recent Blocks (30m)',
      isPreset: true,
      view: 'squid',
      filters: {
        timeWindow: '30m',
        trafficType: 'all',
      },
    },
    {
      id: 'preset-7d-split',
      name: '7-Day Observability',
      isPreset: true,
      view: 'split',
      filters: {
        startDate: past7d,
        endDate: today,
        trafficType: 'all',
      },
    },
    {
      id: 'preset-wan',
      name: 'WAN External Traffic',
      isPreset: true,
      view: 'softflowd',
      filters: {
        startDate: past7d,
        endDate: today,
        trafficType: 'external',
        hideFirewallTraffic: true,
        hideProxyHop: true,
      },
    },
    {
      id: 'preset-lan',
      name: 'LAN East-West Flows',
      isPreset: true,
      view: 'softflowd',
      filters: {
        startDate: past7d,
        endDate: today,
        trafficType: 'internal',
        hideFirewallTraffic: true,
        hideProxyHop: true,
      },
    },
  ];
};

interface SavedViewsDropdownProps {
  currentFilters: GlobalFilterState;
  currentView: 'squid' | 'softflowd' | 'split';
  onApplyView: (view: SavedViewItem) => void;
}

export function SavedViewsDropdown({
  currentFilters,
  currentView,
  onApplyView,
}: SavedViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customViews, setCustomViews] = useState<SavedViewItem[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('saved_views');
      if (stored) {
        setCustomViews(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveCustomView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    const newItem: SavedViewItem = {
      id: `custom-${Date.now()}`,
      name: newViewName.trim(),
      view: currentView,
      filters: { ...currentFilters },
    };

    const next = [...customViews, newItem];
    setCustomViews(next);
    try {
      localStorage.setItem('saved_views', JSON.stringify(next));
    } catch {}
    setNewViewName('');
    setIsSaving(false);
    setActiveViewId(newItem.id);
  };

  const deleteCustomView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    try {
      localStorage.setItem('saved_views', JSON.stringify(next));
    } catch {}
    if (activeViewId === id) setActiveViewId(null);
  };

  const handleSelectView = (view: SavedViewItem) => {
    setActiveViewId(view.id);
    onApplyView(view);
    setIsOpen(false);
  };

  const presets = getPresets();

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-sm"
        title="Saved dashboard view presets and custom bookmarks"
      >
        <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden sm:inline">Saved Views</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-40 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 tracking-wider flex items-center justify-between">
              <span>Standard Views</span>
              <Star className="w-3 h-3 text-amber-400" />
            </div>

            <div className="space-y-0.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectView(p)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                    activeViewId === p.id
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {activeViewId === p.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>

            {customViews.length > 0 && (
              <>
                <div className="border-t border-slate-800 pt-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 tracking-wider">
                    My Bookmarks
                  </div>
                  <div className="space-y-0.5 mt-1 max-h-36 overflow-y-auto">
                    {customViews.map((c) => (
                      <div
                        key={c.id}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group ${
                          activeViewId === c.id
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectView(c)}
                          className="flex-1 text-left truncate cursor-pointer bg-transparent border-0 p-0 text-inherit focus:outline-none"
                        >
                          <span className="truncate">{c.name}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          {activeViewId === c.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          <button
                            type="button"
                            onClick={(e) => deleteCustomView(c.id, e)}
                            aria-label={`Delete saved view ${c.name}`}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-0.5 transition-opacity cursor-pointer"
                            title="Delete this saved view"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-slate-800 pt-1.5">
              {!isSaving ? (
                <button
                  type="button"
                  onClick={() => setIsSaving(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Save Current View</span>
                </button>
              ) : (
                <form onSubmit={saveCustomView} className="space-y-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="e.g. Sales Team Blocks"
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsSaving(false)}
                      className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newViewName.trim()}
                      className="px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
