'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  trigger: (props: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Popover({ trigger, children, align = 'right', className = '' }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignmentClass =
    align === 'left' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {trigger({ isOpen, toggle: () => setIsOpen((prev) => !prev) })}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          className={`absolute ${alignmentClass} mt-2 z-50 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
        >
          {children({ close: () => setIsOpen(false) })}
        </div>
      )}
    </div>
  );
}
