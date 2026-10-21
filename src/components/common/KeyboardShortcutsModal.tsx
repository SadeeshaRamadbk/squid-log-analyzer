'use client';

import React from 'react';
import { Keyboard, X, Search, Navigation, Filter, Moon, Command } from 'lucide-react';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useModalFocusTrap({ isOpen, onClose });

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Navigation & Views',
      icon: Navigation,
      items: [
        { keys: ['1'], description: 'Switch to Squid Proxy (HTTP/S) view' },
        { keys: ['2'], description: 'Switch to pfSense NetFlow (Flows) view' },
        { keys: ['3'], description: 'Switch to Split View (Dual Panel NOC)' },
        { keys: ['4'], description: 'Switch to Syslog (filterlog Events) view' },
      ],
    },
    {
      category: 'Search & Telemetry Scope',
      icon: Search,
      items: [
        { keys: ['Ctrl', 'K'], altKeys: ['⌘', 'K'], description: 'Focus Global Search (IP, Domain, Port)' },
        { keys: ['/'], description: 'Focus Quick Search / Filter input' },
        { keys: ['Esc'], description: 'Close any open modal or popover' },
      ],
    },
    {
      category: 'General & Accessibility',
      icon: Keyboard,
      items: [
        { keys: ['?'], description: 'Toggle this keyboard shortcuts cheat sheet' },
        { keys: ['r'], description: 'Refresh active telemetry and views' },
        { keys: ['Tab'], description: 'Move focus to next interactive element' },
        { keys: ['Shift', 'Tab'], description: 'Move focus to previous element' },
      ],
    },
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-base font-bold text-slate-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-400">
                Quick commands and accessibility navigation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <GroupIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{group.category}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl divide-y divide-slate-800/60">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="text-slate-300 font-medium">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && <span className="text-slate-500 text-[10px]">+</span>}
                            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-200 shadow-sm">
                              {k}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">Esc</kbd> anytime to close dialogs.
        </div>
      </div>
    </div>
  );
}
