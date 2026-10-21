'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';

export type DensityMode = 'compact' | 'normal' | 'comfortable';

export function DensityToggle({ className }: { className?: string } = {}) {
  const [density, setDensity] = useState<DensityMode>('normal');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('app-density') as DensityMode) || 'normal';
      if (saved === 'compact' || saved === 'normal' || saved === 'comfortable') {
        setDensity(saved);
        document.documentElement.setAttribute('data-density', saved);
      } else {
        document.documentElement.setAttribute('data-density', 'normal');
      }
    } catch {
      document.documentElement.setAttribute('data-density', 'normal');
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app-density' && e.newValue) {
        const val = e.newValue as DensityMode;
        if (val === 'compact' || val === 'normal' || val === 'comfortable') {
          setDensity(val);
          document.documentElement.setAttribute('data-density', val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectDensity = (mode: DensityMode) => {
    setDensity(mode);
    setIsOpen(false);
    try {
      localStorage.setItem('app-density', mode);
      document.documentElement.setAttribute('data-density', mode);
      window.dispatchEvent(new CustomEvent('density-change', { detail: { density: mode } }));
    } catch {}
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`UI density: ${density}. Click to change display density.`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={
          className ||
          'h-8 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/80 flex items-center gap-1.5 shadow-sm text-xs'
        }
        title={`UI Density: ${density.charAt(0).toUpperCase() + density.slice(1)} (Click to change)`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden xl:inline capitalize font-medium">{density}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="UI Display Density"
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-1 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Display Density
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectDensity('compact')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
              density === 'compact'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <div>
              <div className="font-medium">Compact</div>
              <div className="text-[10px] opacity-75">Tighter rows &amp; 12px table</div>
            </div>
            {density === 'compact' && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectDensity('normal')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
              density === 'normal'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <div>
              <div className="font-medium">Normal</div>
              <div className="text-[10px] opacity-75">Default: 14px body, 13px table</div>
            </div>
            {density === 'normal' && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectDensity('comfortable')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
              density === 'comfortable'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <div>
              <div className="font-medium">Comfortable</div>
              <div className="text-[10px] opacity-75">Spacious rows &amp; 14px table</div>
            </div>
            {density === 'comfortable' && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
