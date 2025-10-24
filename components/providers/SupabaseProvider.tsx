'use client';

import React, {  createContext, useContext, useEffect, useState  } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';

interface SupabaseContext {
  supabaseClient: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const Context = createContext<SupabaseContext>({
  supabaseClient: null,
  session: null,
  user: null,
  isLoading: true,
});

interface SupabaseProviderProps {
  children: React.ReactNode;
  session?: Session | null;
  enabled?: boolean;
}

export function SupabaseProvider({ children, session: initialSession, enabled = true }: SupabaseProviderProps): React.ReactElement {
  const [supabaseClient] = useState(() => {
    // Don't create client if disabled or not configured
    if (!enabled || !isSupabaseConfigured()) {
      return null;
    }

    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      browserLogger.warn({ error }, 'Failed to create Supabase client');
      return null;
    }
  });

  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [isLoading, setIsLoading] = useState(!initialSession);

  useEffect((): (() => void) | undefined => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }

    // Get initial session if not provided
    if (!initialSession) {
      supabaseClient.auth.getSession().then(({ data: { session } }): void => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session): void => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, initialSession]);

  const value: SupabaseContext = {
    supabaseClient,
    session,
    user,
    isLoading,
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
}

/**
 * Hook to access Supabase client and session
 *
 * Replaces deprecated useSessionContext from @supabase/auth-helpers-react
 *
 * @returns Supabase context with client, session, user, and loading state
 *
 * @example
 * const { supabaseClient, session, user, isLoading } = useSupabase();
 */
export function useSupabase(): SupabaseContext {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
