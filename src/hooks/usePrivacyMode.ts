'use client';

import { useState, useEffect } from 'react';

/**
 * React hook to observe and toggle employee name privacy masking across all dashboard panels
 */
export function usePrivacyMode(): boolean {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    try {
      setIsPrivacyMode(localStorage.getItem('privacy_mode') === 'true');
    } catch {}

    const handleUpdate = () => {
      try {
        setIsPrivacyMode(localStorage.getItem('privacy_mode') === 'true');
      } catch {}
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('privacy-mode-change', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('privacy-mode-change', handleUpdate);
    };
  }, []);

  return isPrivacyMode;
}
