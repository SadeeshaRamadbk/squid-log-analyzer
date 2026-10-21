'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseGlobalShortcutsOptions {
  onViewChange?: (view: 'squid' | 'softflowd' | 'split') => void;
  activeView?: 'squid' | 'softflowd' | 'syslog' | 'split';
  onRefresh?: () => void;
}

export function useGlobalShortcuts({ onViewChange, onRefresh }: UseGlobalShortcutsOptions = {}) {
  const router = useRouter();
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isInput =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable;

      if (isInput) return;

      // '?' opens shortcuts modal (Shift + '/')
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 'r' or 'R' refreshes active view data
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
        return;
      }

      // '/' focuses search input
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const searchInput = (document.getElementById('global-ip-search-input') ||
          document.getElementById('global-search-input')) as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // '1', '2', '3', '4' view navigation
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          if (onViewChange) {
            onViewChange('squid');
          } else {
            router.push('/');
          }
        } else if (e.key === '2') {
          e.preventDefault();
          if (onViewChange) {
            onViewChange('softflowd');
          } else {
            router.push('/softflowd');
          }
        } else if (e.key === '3') {
          e.preventDefault();
          if (onViewChange) {
            onViewChange('split');
          } else {
            router.push('/?view=split');
          }
        } else if (e.key === '4') {
          e.preventDefault();
          router.push('/syslog');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange, onRefresh, router]);

  return {
    shortcutsModalOpen,
    setShortcutsModalOpen,
  };
}
