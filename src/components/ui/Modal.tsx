'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-xl', 'max-w-2xl', 'max-w-4xl'
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
  className = '',
}: ModalProps) {
  const modalRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-standard-title"
        aria-describedby={description ? 'modal-standard-desc' : undefined}
        tabIndex={-1}
        className={`bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden outline-none ${className}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 id="modal-standard-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            {description && (
              <p id="modal-standard-desc" className="text-xs text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
