'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className }: { className?: string } = {}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as 'dark' | 'light' | null;
    const isLight = saved === 'light' || document.documentElement.classList.contains('light-theme');
    if (isLight) {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light-theme');
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app-theme') {
        const val = e.newValue === 'light' ? 'light' : 'dark';
        setTheme(val);
        if (val === 'light') {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('app-theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={className || "p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-3.5 h-3.5 text-amber-400" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-indigo-400" />
      )}
    </button>
  );
}
