import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useClerk, useUser } from "@clerk/expo";

import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import {
  clearSession,
  consumePendingAuthProvider,
  getSession,
  setLastAuthProvider,
  setSession,
  type Session,
} from "@/lib/session";
import type { User } from "@/types/user";

type AuthSessionContextValue = {
  session: Session | null;
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  /** Call after email/password login or registration succeeds. */
  establishSession: (session: Session) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ data: User }>("/api/users/me");
    return data.data;
  } catch {
    return null;
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [session, setSessionState] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateFromStorage = useCallback(async () => {
    const stored = await getSession();
    setSessionState(stored);
    if (!stored) {
      setUser(null);
      return null;
    }
    const me = await fetchCurrentUser();
    // Keep AsyncStorage session even when /me 404s (e.g. Clerk OAuth id not in DB yet).
    // Email/password users will have a matching /me row and populate profile fields.
    setUser(me);
    if (me && me.role !== stored.role) {
      const next = { userId: me.id, role: me.role };
      await setSession(next);
      setSessionState(next);
    }
    return me;
  }, []);

  const establishSession = useCallback(async (next: Session) => {
    await setSession(next);
    setSessionState(next);
    const me = await fetchCurrentUser();
    setUser(me);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchCurrentUser();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (clerk?.signOut) {
        await clerk.signOut();
      }
    } catch {
      // ignore Clerk sign-out failures
    }
    await clearSession();
    setSessionState(null);
    setUser(null);
    queryClient.clear();
  }, [clerk]);

  // App start: restore AsyncStorage session (email/password persistence).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await hydrateFromStorage();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromStorage]);

  // Clerk OAuth can establish a session — never wipe backend session when Clerk is null.
  useEffect(() => {
    if (!clerkUser?.id) return;

    let cancelled = false;
    (async () => {
      const pending = await consumePendingAuthProvider();
      if (pending) {
        await setLastAuthProvider(pending);
      }
      const next: Session = { userId: clerkUser.id, role: "renter" };
      await setSession(next);
      if (cancelled) return;
      setSessionState(next);
      // Clerk ids may not exist in Postgres yet — keep session even if /me 404s.
      const me = await fetchCurrentUser();
      if (!cancelled) setUser(me);
    })();

    return () => {
      cancelled = true;
    };
  }, [clerkUser?.id]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      user,
      isSignedIn: !!session,
      isLoading,
      establishSession,
      refreshUser,
      logout,
    }),
    [session, user, isLoading, establishSession, refreshUser, logout],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
