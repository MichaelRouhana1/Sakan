import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useClerk, useSession, useUser } from "@clerk/expo";
import {
  normalizeDeviceSessions,
  type ClerkSessionWithActivitiesLike,
  type DeviceSessionItem,
} from "./deviceSessions";

export type DeviceSessionsStatus = "loading" | "ready" | "empty" | "error";

export type DeviceSessionsState = {
  status: DeviceSessionsStatus;
  sessions: DeviceSessionItem[];
  errorMessage: string | null;
  actionError: string | null;
  revokingId: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  revokeSession: (
    item: DeviceSessionItem,
  ) => Promise<{ ok: true; title: string } | { ok: false; error: string }>;
  clearActionError: () => void;
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    anyErr?.errors?.[0]?.longMessage ||
    anyErr?.errors?.[0]?.message ||
    anyErr?.message ||
    fallback
  );
}

/**
 * Reads active Clerk sessions for the signed-in user and handles revoking other devices.
 *
 * Workarounds for @clerk/clerk-js@6.42.3 (via @clerk/expo@4.15.1):
 * 1. User.getSessions() memoizes on `cachedSessionsWithActivities` and never invalidates it.
 *    We call `user.reload()` before fetching so `clerk.user` is replaced with a fresh instance.
 * 2. SessionWithActivities.retrieve() catches errors and resolves to `[]`.
 *    When the user is signed in, an empty result is surfaced as an error state with Retry.
 */
export function useClerkDeviceSessions(enabled = true): DeviceSessionsState {
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, sessionId: authSessionId } = useAuth();
  const { session: activeSession } = useSession();
  const { isLoaded: userLoaded, user: clerkUser } = useUser();

  const currentSessionId =
    authSessionId ?? activeSession?.id ?? clerk.session?.id ?? null;

  const [status, setStatus] = useState<DeviceSessionsStatus>("loading");
  const [sessions, setSessions] = useState<DeviceSessionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const clerkRef = useRef(clerk);
  const userRef = useRef(clerkUser);
  const currentSessionIdRef = useRef(currentSessionId);
  const signedInRef = useRef(Boolean(isSignedIn || currentSessionId));

  clerkRef.current = clerk;
  userRef.current = clerkUser;
  currentSessionIdRef.current = currentSessionId;
  signedInRef.current = Boolean(isSignedIn || currentSessionId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSessions = useCallback(
    async (options?: { reloadUser?: boolean; background?: boolean }) => {
      const seq = ++requestSeqRef.current;
      const shouldReload = options?.reloadUser ?? true;
      const isBackground = options?.background ?? false;
      const baseUser = clerkRef.current.user ?? userRef.current;

      if (!baseUser) {
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setSessions([]);
        setErrorMessage(null);
        setStatus("empty");
        setRefreshing(false);
        return;
      }

      if (isBackground) {
        setRefreshing(true);
      } else {
        setStatus("loading");
      }
      setErrorMessage(null);

      try {
        if (shouldReload) {
          await baseUser.reload();
        }
        const freshUser = clerkRef.current.user ?? baseUser;
        const raw =
          (await freshUser.getSessions()) as ClerkSessionWithActivitiesLike[];

        if (!mountedRef.current || seq !== requestSeqRef.current) return;

        const activeId =
          currentSessionIdRef.current ?? clerkRef.current.session?.id ?? null;
        const normalized = normalizeDeviceSessions(raw, activeId);

        if (normalized.length === 0) {
          if (signedInRef.current) {
            setSessions([]);
            setErrorMessage(
              "We couldn’t load your signed-in devices. Check your connection and try again.",
            );
            setStatus("error");
          } else {
            setSessions([]);
            setStatus("empty");
          }
          return;
        }

        setSessions(normalized);
        setStatus("ready");
      } catch (err) {
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setErrorMessage(
          extractErrorMessage(
            err,
            "We couldn’t load your signed-in devices. Check your connection and try again.",
          ),
        );
        setStatus("error");
      } finally {
        if (mountedRef.current && seq === requestSeqRef.current) {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    if (!authLoaded || !userLoaded) return;
    if (!clerkUser) {
      setSessions([]);
      setStatus("empty");
      return;
    }
    void fetchSessions({ reloadUser: true, background: false });
  }, [enabled, authLoaded, userLoaded, clerkUser?.id, currentSessionId, fetchSessions]);

  const refresh = useCallback(async () => {
    setActionError(null);
    await fetchSessions({
      reloadUser: true,
      background: status === "ready",
    });
  }, [fetchSessions, status]);

  const revokeSession = useCallback(
    async (
      item: DeviceSessionItem,
    ): Promise<{ ok: true; title: string } | { ok: false; error: string }> => {
      if (item.isCurrent) {
        return { ok: false, error: "You can’t log out your current session here." };
      }

      setActionError(null);
      setRevokingId(item.id);
      try {
        await item.raw.revoke();

        // Reload Clerk user so `cachedSessionsWithActivities` is cleared before re-fetching.
        const baseUser = clerkRef.current.user ?? userRef.current;
        if (baseUser) {
          try {
            await baseUser.reload();
            const freshUser = clerkRef.current.user ?? baseUser;
            const raw =
              (await freshUser.getSessions()) as ClerkSessionWithActivitiesLike[];
            if (mountedRef.current) {
              const activeId =
                currentSessionIdRef.current ?? clerkRef.current.session?.id ?? null;
              const next = normalizeDeviceSessions(raw, activeId).filter(
                (entry) => entry.id !== item.id,
              );
              if (next.length > 0) {
                setSessions(next);
                setStatus("ready");
              } else {
                // Keep remaining local sessions if refresh unexpectedly returned empty.
                setSessions((prev) => prev.filter((entry) => entry.id !== item.id));
              }
            }
          } catch {
            // Revocation already succeeded on Clerk; remove row locally so UI stays accurate.
            if (mountedRef.current) {
              setSessions((prev) => prev.filter((entry) => entry.id !== item.id));
            }
          }
        } else if (mountedRef.current) {
          setSessions((prev) => prev.filter((entry) => entry.id !== item.id));
        }

        return { ok: true, title: item.title };
      } catch (err) {
        const msg = extractErrorMessage(
          err,
          `Couldn’t log out of ${item.title}. Try again.`,
        );
        if (mountedRef.current) {
          setActionError(msg);
        }
        return { ok: false, error: msg };
      } finally {
        if (mountedRef.current) {
          setRevokingId((prev) => (prev === item.id ? null : prev));
        }
      }
    },
    [],
  );

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    status,
    sessions,
    errorMessage,
    actionError,
    revokingId,
    refreshing,
    refresh,
    revokeSession,
    clearActionError,
  };
}
