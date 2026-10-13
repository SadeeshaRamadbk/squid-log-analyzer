'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Building, X, ExternalLink, Activity } from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { IpSearchResult } from '@/lib/db/profile-queries';

interface GlobalIpSearchProps {
  onSelectProfile: (ip: string) => void;
}

export function GlobalIpSearch({ onSelectProfile }: GlobalIpSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<IpSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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
        if (data.success && Array.isArray(data.results)) {
          setResults(data.results);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (ip: string) => {
    setIsOpen(false);
    onSelectProfile(ip);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex].clientIp);
      } else if (results.length > 0) {
        handleSelect(results[0].clientIp);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs md:max-w-sm">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search IP, User, Dept... (Ctrl+K)"
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-1 divide-y divide-slate-800/60">
          <div className="p-2 bg-slate-950/40 text-[10px] text-slate-400 flex items-center justify-between font-semibold uppercase tracking-wider">
            <span>Known Host Dossiers &bull; {results.length} found</span>
            {loading && <Activity className="w-3 h-3 animate-spin text-indigo-400" />}
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {loading ? 'Searching hosts...' : `No matching IPs or employees found for "${query}"`}
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.clientIp}
                type="button"
                onClick={() => handleSelect(item.clientIp)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  selectedIndex === idx ? 'bg-indigo-600/20 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-300 font-mono text-[11px] font-semibold">
                    {item.clientIp}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {item.userName ? (
                        <span className="truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400 shrink-0" />
                          <strong className="text-slate-100">{item.userName}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
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

                <div className="text-right text-[10px] text-slate-400 shrink-0">
                  <span className="text-indigo-300 font-medium font-mono">View Profile ➔</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
