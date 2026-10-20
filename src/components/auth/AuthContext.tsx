'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface UserProfile {
  userId: number;
  username: string;
  role: 'admin' | 'viewer';
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<UserProfile | null>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  logout: async () => {},
  refreshAuth: async () => null,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        return data.user as UserProfile;
      } else {
        setUser(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          router.push('/login');
        }
        return null;
      }
    } catch {
      setUser(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.push('/login');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Re-fetch auth on initial mount and whenever route changes into an authenticated page
  useEffect(() => {
    if (pathname !== '/login') {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, [pathname, fetchMe]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      router.replace('/login');
    }
  };

  const refreshAuth = async (): Promise<UserProfile | null> => {
    return await fetchMe();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        logout,
        refreshAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
