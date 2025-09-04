import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextValue = {
  isAuthenticated: boolean;
  userName: string | null;
  login: (userName: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isRestoring: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'auth_state_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { isAuthenticated: boolean; userName: string | null };
          setIsAuthenticated(!!saved.isAuthenticated);
          setUserName(saved.userName ?? null);
        }
      } catch {
        // ignore restoration errors
      }

      // If Supabase is configured, prefer its session for truth
      try {
        const { hasSupabaseConfig, getSupabase } = await import('@/lib/supabase');
        if (hasSupabaseConfig()) {
          const supabase = getSupabase();
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user) {
            setIsAuthenticated(true);
            setUserName(session.user.email ?? session.user.id);
            await persist({ isAuthenticated: true, userName: session.user.email ?? session.user.id });
          }
          const { data: sub } = supabase.auth.onAuthStateChange(async (_event, current) => {
            if (current?.user) {
              setIsAuthenticated(true);
              setUserName(current.user.email ?? current.user.id);
              await persist({ isAuthenticated: true, userName: current.user.email ?? current.user.id });
            } else {
              setIsAuthenticated(false);
              setUserName(null);
              await persist({ isAuthenticated: false, userName: null });
            }
          });
          // Clean up subscription on unmount
          return () => {
            sub.subscription?.unsubscribe();
          };
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const persist = useCallback(async (auth: { isAuthenticated: boolean; userName: string | null }) => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    setError(null);
    try {
      const { hasSupabaseConfig, getSupabase } = await import('@/lib/supabase');
      if (hasSupabaseConfig()) {
        const supabase = getSupabase();
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: name, password });
        if (err || !data.session) throw err ?? new Error('Invalid credentials');
        setIsAuthenticated(true);
        setUserName(data.session.user.email ?? data.session.user.id);
        await persist({ isAuthenticated: true, userName: data.session.user.email ?? data.session.user.id });
      } else {
        throw new Error('Supabase is not configured');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
      throw e;
    }
  }, [persist]);

  const signup = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { hasSupabaseConfig, getSupabase } = await import('@/lib/supabase');
      if (!hasSupabaseConfig()) throw new Error('Supabase is not configured');
      const supabase = getSupabase();
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const { hasSupabaseConfig, getSupabase } = await import('@/lib/supabase');
      if (hasSupabaseConfig()) {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      }
    } catch {
      // ignore signout errors
    } finally {
      setIsAuthenticated(false);
      setUserName(null);
      await persist({ isAuthenticated: false, userName: null });
    }
  }, [persist]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated,
    userName,
    login,
    signup,
    logout,
    isRestoring,
    error,
  }), [isAuthenticated, userName, login, signup, logout, isRestoring, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


