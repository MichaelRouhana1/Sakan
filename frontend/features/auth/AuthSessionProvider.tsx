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
import { setActiveDraftUserId } from "@/features/listings/create/createDraftCheckpoint";
import "@/features/listings/create/draftAccountSync";
import { setAuthTokenGetter } from "@/lib/api";
import {
  completeOAuthRedirectIfPresent,
  isOAuthCallbackLocation,
  clerkTokenFailure,
  getFreshClerkToken,
  waitForClerkToken,
} from "@/lib/clerkAuth";
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
  /** Clerk still has a session, even if the app account failed to load. */
  hasClerkSession: boolean;
  isLoading: boolean;
  syncWithBackend: () => Promise<User | null>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function clearClerkBrowserCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("__clerk") || key.startsWith("clerk-")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage failures
  }
}

const disabledValue: AuthSessionContextValue = {
  session: null,
  user: null,
  isSignedIn: false,
  hasClerkSession: false,
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
  setActiveDraftUserId(session?.userId ?? null);

  useEffect(() => {
    setAuthTokenGetter(() => getFreshClerkToken(clerk.session));

    return () => setAuthTokenGetter(null);
  }, [clerk, clerk.session?.id]);

  const syncWithBackend = useCallback(async () => {
    const hasClerkSession = Boolean(clerk.session?.id || isClerkSignedIn);
    if (!hasClerkSession) {
      await clearSession();
      setSessionState(null);
      setUser(null);
      return null;
    }

    const token = await waitForClerkToken(clerk);
    if (!token) {
      throw new Error(clerkTokenFailure());
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
  }, [clerk, isClerkSignedIn, clerk.session?.id]);

  const refreshUser = useCallback(async () => {
    if (!clerk.session?.id && !isClerkSignedIn) return null;
    const token = await waitForClerkToken(clerk);
    if (!token) return null;
    const me = await fetchMe();
    setUser(me);
    if (me) {
      const next = { userId: me.id, role: me.role };
      await setSession(next);
      setSessionState(next);
    }
    return me;
  }, [clerk, isClerkSignedIn, clerk.session?.id]);

  const logout = useCallback(async () => {
    try {
      if (clerkRef.current?.signOut) {
        await clerkRef.current.signOut();
      }
    } catch {
      // ignore Clerk sign-out failures
    }
    await clearSession();
    clearClerkBrowserCache();
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
        const onOAuthCallback = isOAuthCallbackLocation();
        const oauthCompleted = await completeOAuthRedirectIfPresent(clerk);
        const signedIn = Boolean(
          oauthCompleted || isClerkSignedIn || clerk.session?.id,
        );
        if (signedIn) {
          await syncWithBackend();
        } else if (onOAuthCallback) {
          // Callback is still finishing the Clerk handshake — don't wipe state.
        } else {
          await clearSession();
          if (!cancelled) {
            setSessionState(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to sync Clerk session with backend:", err);
        if (
          !cancelled &&
          !isClerkSignedIn &&
          !clerk.session?.id &&
          !isOAuthCallbackLocation()
        ) {
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
  }, [isClerkLoaded, isClerkSignedIn, clerkUser?.id, clerk, syncWithBackend]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      user,
      isSignedIn: Boolean((isClerkSignedIn || clerk.session?.id) && user),
      hasClerkSession: Boolean(isClerkSignedIn || clerk.session?.id),
      isLoading: !isClerkLoaded || isLoading,
      syncWithBackend,
      refreshUser,
      logout,
    }),
    [
      session,
      user,
      isClerkSignedIn,
      clerk.session?.id,
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
    setActiveDraftUserId(null);
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
