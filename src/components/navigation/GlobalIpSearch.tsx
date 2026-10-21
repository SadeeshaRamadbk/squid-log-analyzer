'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Building, X, Globe, Tag, Activity } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { GlobalSearchResult } from '@/lib/db/profile-queries';

interface GlobalIpSearchProps {
  onSelectProfile: (ip: string) => void;
  onSelectDomain?: (domain: string) => void;
  onSelectPort?: (port: number, protocol?: string) => void;
}

export function GlobalIpSearch({ onSelectProfile, onSelectDomain, onSelectPort }: GlobalIpSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalSearchResult>({ ips: [], domains: [], ports: [] });
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch search results as user types
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profile?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          if (data.global) {
            setGlobalData(data.global);
          } else if (Array.isArray(data.results)) {
            setGlobalData({ ips: data.results, domains: [], ports: [] });
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelectIp = (ip: string) => {
    setIsOpen(false);
    onSelectProfile(ip);
  };

  const handleSelectDomain = (domain: string) => {
    setIsOpen(false);
    onSelectDomain?.(domain);
  };

  const handleSelectPort = (port: number, protocol?: string) => {
    setIsOpen(false);
    onSelectPort?.(port, protocol);
  };

  const totalResults = globalData.ips.length + globalData.domains.length + globalData.ports.length;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs md:max-w-sm">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          id="global-ip-search-input"
          type="text"
          value={query}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="global-ip-search-results"
          aria-label="Unified Search across IP, User, Domain, and Port"
          aria-keyshortcuts="Control+K Meta+K"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder="Search IP, User, Domain, Port (Ctrl+K)"
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search query"
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div
          id="global-ip-search-results"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-1 divide-y divide-slate-800/60"
        >
          <div className="p-2 bg-slate-950/40 text-[10px] text-slate-400 flex items-center justify-between font-semibold uppercase tracking-wider">
            <span>Unified Search &bull; {totalResults} found</span>
            {loading && <Activity className="w-3 h-3 animate-spin text-indigo-400" />}
          </div>

          {totalResults === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {loading ? 'Searching network telemetry...' : `No matching IPs, domains, or ports found for "${query}"`}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {/* IPs & Employees */}
              {globalData.ips.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/30 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-indigo-400" />
                    <span>Employees & Hosts ({globalData.ips.length})</span>
                  </div>
                  {globalData.ips.map((item) => (
                    <button
                      key={item.clientIp}
                      type="button"
                      onClick={() => handleSelectIp(item.clientIp)}
                      className="w-full text-left p-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] font-semibold">
                          {item.clientIp}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            {item.userName ? (
                              <strong className="text-slate-100 truncate">{item.userName}</strong>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                            )}
                          </div>
                          {item.department && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                              <Building className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                              {item.department}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-300 font-medium font-mono shrink-0">Profile ➔</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Domains */}
              {globalData.domains.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/30 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Domains ({globalData.domains.length})</span>
                  </div>
                  {globalData.domains.map((item) => (
                    <button
                      key={item.domain}
                      type="button"
                      onClick={() => handleSelectDomain(item.domain)}
                      className="w-full text-left p-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-200 truncate">{item.domain}</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                        <span>{formatNumber(item.totalRequests)} reqs</span>
                        <span className="text-emerald-400 font-medium ml-2">Inspect ➔</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Ports & Services */}
              {globalData.ports.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-950/30 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-purple-400" />
                    <span>Application Services & Ports ({globalData.ports.length})</span>
                  </div>
                  {globalData.ports.map((item) => (
                    <button
                      key={`${item.port}-${item.protocol}`}
                      type="button"
                      onClick={() => handleSelectPort(item.port, item.protocol)}
                      className="w-full text-left p-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/40 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold">
                          {item.port}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{item.serviceName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({item.protocol})</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                        <span>{formatBytes(item.totalBytes)}</span>
                        <span className="text-purple-400 font-medium ml-2">Inspect ➔</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
