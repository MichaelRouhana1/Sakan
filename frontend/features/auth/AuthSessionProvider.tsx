import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useClerk, useUser } from "@clerk/expo";

import { api } from "@/lib/api";
import { useClerkEnabled } from "@/lib/clerkEnabled";
import { queryClient } from "@/lib/queryClient";
import {
  clearSession,
  consumePendingAuthProvider,
  getSession,
  setLastAuthProvider,
  setSession,
  type Session,
} from "@/lib/session";
import { syncClerkUser } from "@/features/auth/registrationApi";
import type { User } from "@/types/user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};

type ClerkClientLike = {
  signOut?: () => Promise<unknown>;
};

function ClerkSessionBridge({
  clerkRef,
  onUser,
}: {
  clerkRef: React.MutableRefObject<ClerkClientLike | null>;
  onUser: (user: ClerkUserLike | null) => void;
}) {
  const clerk = useClerk();
  const { user } = useUser();
  clerkRef.current = clerk;
  useEffect(() => {
    onUser(user ?? null);
  }, [onUser, user]);
  return null;
}

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
  const clerkEnabled = useClerkEnabled();
  const clerkRef = useRef<ClerkClientLike | null>(null);
  const [clerkUser, setClerkUser] = useState<ClerkUserLike | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateFromStorage = useCallback(async () => {
    const stored = await getSession();
    if (!stored) {
      setSessionState(null);
      setUser(null);
      return null;
    }

    if (!UUID_RE.test(stored.userId)) {
      await clearSession();
      setSessionState(null);
      setUser(null);
      return null;
    }

    setSessionState(stored);
    const me = await fetchCurrentUser();
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

  // Clerk OAuth establishes a session synced with Postgres user table.
  useEffect(() => {
    if (!clerkUser?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const pending = await consumePendingAuthProvider();
        if (pending) {
          await setLastAuthProvider(pending);
        }
        const syncedUser = await syncClerkUser({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        });
        if (cancelled) return;

        const next: Session = { userId: syncedUser.id, role: syncedUser.role };
        await setSession(next);
        setSessionState(next);
        setUser(syncedUser);
      } catch (err) {
        console.error("Failed to sync Clerk user with backend:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    clerkUser?.id,
    clerkUser?.primaryEmailAddress?.emailAddress,
    clerkUser?.firstName,
    clerkUser?.lastName,
  ]);

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
      {clerkEnabled ? (
        <ClerkSessionBridge clerkRef={clerkRef} onUser={setClerkUser} />
      ) : null}
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
