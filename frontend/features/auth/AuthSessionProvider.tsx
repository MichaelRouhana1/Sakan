import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth, useClerk, useUser } from "@clerk/expo";

import { fetchMe } from "@/features/auth/userApi";
import { setAuthTokenGetter } from "@/lib/api";
import { useClerkEnabled } from "@/lib/clerkEnabled";
import { queryClient } from "@/lib/queryClient";
import {
  clearSession,
  consumePendingAuthProvider,
  setLastAuthProvider,
  setSession,
  type Session,
} from "@/lib/session";
import type { User } from "@/types/user";

type ClerkClientLike = {
  signOut?: () => Promise<unknown>;
  session?: {
    getToken: () => Promise<string | null>;
  } | null;
};

type AuthSessionContextValue = {
  session: Session | null;
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  syncWithBackend: () => Promise<User | null>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const disabledValue: AuthSessionContextValue = {
  session: null,
  user: null,
  isSignedIn: false,
  isLoading: false,
  syncWithBackend: async () => null,
  refreshUser: async () => null,
  logout: async () => {},
};

function ClerkAuthSessionProvider({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const clerkRef = useRef<ClerkClientLike | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  clerkRef.current = clerk;

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return (await clerk.session?.getToken()) ?? null;
      } catch {
        return null;
      }
    });

    return () => setAuthTokenGetter(null);
  }, [clerk, clerk.session?.id]);

  const syncWithBackend = useCallback(async () => {
    if (!isClerkSignedIn) {
      await clearSession();
      setSessionState(null);
      setUser(null);
      return null;
    }

    const me = await fetchMe();
    const pending = await consumePendingAuthProvider();
    if (pending) {
      await setLastAuthProvider(pending);
    }
    const next: Session = { userId: me.id, role: me.role };
    await setSession(next);
    setSessionState(next);
    setUser(me);
    return me;
  }, [isClerkSignedIn]);

  const refreshUser = useCallback(async () => {
    if (!isClerkSignedIn) return null;
    const me = await fetchMe();
    setUser(me);
    if (me) {
      const next = { userId: me.id, role: me.role };
      await setSession(next);
      setSessionState(next);
    }
    return me;
  }, [isClerkSignedIn]);

  const logout = useCallback(async () => {
    try {
      if (clerkRef.current?.signOut) {
        await clerkRef.current.signOut();
      }
    } catch {
      // ignore Clerk sign-out failures
    }
    await clearSession();
    setSessionState(null);
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    if (!isClerkLoaded) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        if (isClerkSignedIn) {
          await syncWithBackend();
        } else {
          await clearSession();
          if (!cancelled) {
            setSessionState(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to sync Clerk session with backend:", err);
        if (!cancelled) {
          setSessionState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isClerkLoaded, isClerkSignedIn, clerkUser?.id, syncWithBackend]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      user,
      isSignedIn: Boolean(isClerkSignedIn && user),
      isLoading: !isClerkLoaded || isLoading,
      syncWithBackend,
      refreshUser,
      logout,
    }),
    [
      session,
      user,
      isClerkSignedIn,
      isClerkLoaded,
      isLoading,
      syncWithBackend,
      refreshUser,
      logout,
    ],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const clerkEnabled = useClerkEnabled();

  if (!clerkEnabled) {
    return (
      <AuthSessionContext.Provider value={disabledValue}>
        {children}
      </AuthSessionContext.Provider>
    );
  }

  return <ClerkAuthSessionProvider>{children}</ClerkAuthSessionProvider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
