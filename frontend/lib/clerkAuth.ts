import { Platform } from "react-native";

declare global {
  interface Window {
    __SKOUN_OAUTH_HREF?: string;
  }
}

if (typeof window !== "undefined" && !window.__SKOUN_OAUTH_HREF) {
  window.__SKOUN_OAUTH_HREF = window.location.href;
}

type ClerkSessionLike = {
  id?: string;
  user?: unknown;
  reload?: () => Promise<unknown>;
  getToken?: (opts?: { skipCache?: boolean }) => Promise<string | null>;
};

type ClerkLike = {
  loaded?: boolean;
  session?: ClerkSessionLike | null;
  setActive?: (args: { session: string }) => Promise<unknown>;
  handleRedirectCallback?: (
    params?: Record<string, unknown>,
    customNavigate?: (to: string) => Promise<unknown> | unknown,
  ) => Promise<unknown>;
  client?: {
    signIn?: {
      create?: (args: {
        strategy: string;
        redirectUrl: string;
        actionCompleteRedirectUrl?: string;
      }) => Promise<unknown>;
      authenticateWithRedirect?: (args: {
        strategy: string;
        redirectUrl: string;
        redirectUrlComplete: string;
        continueSignUp?: boolean;
        continueSignIn?: boolean;
      }) => Promise<void>;
      reload?: (args?: { rotatingTokenNonce?: string }) => Promise<unknown>;
      status?: string;
      createdSessionId?: string | null;
      firstFactorVerification?: {
        status?: string | null;
        externalVerificationRedirectURL?: { toString: () => string } | string | null;
      };
    } | null;
    signUp?: {
      create?: (args: { transfer: boolean }) => Promise<{ createdSessionId?: string | null }>;
      createdSessionId?: string | null;
    } | null;
    sessions?: { id: string }[];
  };
};

export function isAlreadySignedInError(err: unknown): boolean {
  const anyErr = err as {
    errors?: { message?: string; code?: string }[];
    message?: string;
    code?: string;
  };
  const code = anyErr?.errors?.[0]?.code || anyErr?.code;
  const msg = (
    anyErr?.errors?.[0]?.message ||
    anyErr?.message ||
    ""
  ).toLowerCase();
  return (
    code === "session_exists" ||
    code === "identifier_already_signed_in" ||
    msg.includes("already signed in") ||
    msg.includes("session already exists")
  );
}

function jwtExpiryMs(token: string): number | null {
  const segment = token.split(".")[1];
  if (!segment || typeof globalThis.atob !== "function") return null;
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Clerk session JWTs last about a minute. A cached one is often already expired. */
export function isFreshClerkToken(token: string, leewayMs = 15_000): boolean {
  const exp = jwtExpiryMs(token);
  if (exp == null) return true;
  return exp - Date.now() > leewayMs;
}

let lastClerkTokenFailure = "Clerk session token was not ready.";

export function clerkTokenFailure(): string {
  return lastClerkTokenFailure;
}

function describeToken(token: string | null): string {
  if (!token) return "Clerk returned no session token";
  const exp = jwtExpiryMs(token);
  if (exp == null) return "Clerk token has no expiry";
  const seconds = Math.round((exp - Date.now()) / 1000);
  return seconds > 0
    ? `Clerk token is valid for ${seconds}s`
    : `Clerk token expired ${-seconds}s ago`;
}

async function readSessionToken(
  session: ClerkSessionLike,
  skipCache: boolean,
): Promise<{ token: string | null; detail: string }> {
  if (!session.getToken) {
    return { token: null, detail: "Clerk session cannot mint a token" };
  }
  try {
    const token = (await session.getToken({ skipCache })) ?? null;
    return { token, detail: describeToken(token) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clerk token request failed";
    return { token: null, detail: message };
  }
}

export async function getFreshClerkToken(
  session: ClerkSessionLike | null | undefined,
): Promise<string | null> {
  if (!session?.getToken) {
    lastClerkTokenFailure = "Clerk session is missing.";
    return null;
  }
  const cached = await readSessionToken(session, false);
  if (cached.token && isFreshClerkToken(cached.token)) return cached.token;
  const fresh = await readSessionToken(session, true);
  if (fresh.token && isFreshClerkToken(fresh.token)) return fresh.token;
  lastClerkTokenFailure = session.user
    ? fresh.detail || cached.detail
    : "Clerk session has no user yet";
  return null;
}

export async function waitForClerkToken(
  clerk: ClerkLike,
  tries = 8,
): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const session = clerk.session;
    if (i === 1 && session?.reload) {
      try {
        await session.reload();
      } catch (err) {
        lastClerkTokenFailure =
          err instanceof Error ? err.message : "Clerk session reload failed";
      }
    }
    const token = await getFreshClerkToken(session);
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

export async function activateClerkSession(
  clerk: ClerkLike,
  sessionId?: string | null,
): Promise<boolean> {
  const id =
    sessionId ||
    clerk.session?.id ||
    clerk.client?.signUp?.createdSessionId ||
    clerk.client?.signIn?.createdSessionId ||
    clerk.client?.sessions?.[0]?.id;
  if (id && clerk.setActive) {
    await clerk.setActive({ session: id });
  }
  const token = await waitForClerkToken(clerk);
  return Boolean(token);
}

type OAuthFlowResult = {
  createdSessionId?: string | null;
  setActive?: (args: { session: string }) => Promise<unknown>;
  signIn?: ClerkLike["client"] extends { signIn?: infer S } ? S : never;
  signUp?: {
    create?: (args: { transfer: boolean }) => Promise<{ createdSessionId?: string | null }>;
    createdSessionId?: string | null;
    status?: string;
  };
};

export async function completeOAuthSession(
  clerk: ClerkLike,
  result: OAuthFlowResult,
): Promise<boolean> {
  let sessionId = result.createdSessionId || "";

  if (
    !sessionId &&
    result.signIn?.firstFactorVerification?.status === "transferable" &&
    result.signUp?.create
  ) {
    const transferred = await result.signUp.create({ transfer: true });
    sessionId = transferred.createdSessionId || result.signUp.createdSessionId || "";
  }

  if (!sessionId && result.signIn?.status === "complete") {
    sessionId = result.signIn.createdSessionId || "";
  }

  if (!sessionId && result.signUp?.createdSessionId) {
    sessionId = result.signUp.createdSessionId;
  }

  if (!sessionId) {
    return activateClerkSession(clerk);
  }

  if (result.setActive) {
    await result.setActive({ session: sessionId });
  } else if (clerk.setActive) {
    await clerk.setActive({ session: sessionId });
  }

  return activateClerkSession(clerk, sessionId);
}

const OAUTH_RETURN_TO_KEY = "skoun.oauth.returnTo";

let oauthRedirectInFlight: Promise<boolean> | null = null;
let oauthDidNavigate = false;

export function didOAuthNavigateAway(): boolean {
  return oauthDidNavigate;
}

function sanitizeReturnTo(stored: string | null): string {
  if (!stored || !stored.startsWith("/") || stored.startsWith("//")) return "/";
  if (stored.startsWith("/oauth-native-callback")) return "/";
  return stored;
}

export function rememberOAuthReturnTo(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  try {
    sessionStorage.setItem(OAUTH_RETURN_TO_KEY, path || "/");
  } catch {
    // ignore storage failures
  }
}

export function peekOAuthReturnTo(): string {
  if (Platform.OS !== "web" || typeof window === "undefined") return "/";
  try {
    return sanitizeReturnTo(sessionStorage.getItem(OAUTH_RETURN_TO_KEY));
  } catch {
    return "/";
  }
}

export function consumeOAuthReturnTo(): string {
  if (Platform.OS !== "web" || typeof window === "undefined") return "/";
  try {
    const stored = sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
    sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
    return sanitizeReturnTo(stored);
  } catch {
    return "/";
  }
}

export function isOAuthCallbackLocation(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  restoreOAuthCallbackUrlIfNeeded();
  if (window.location.pathname.includes("oauth-native-callback")) return true;
  const params = oauthCallbackSearchParams();
  return (
    params.has("rotating_token_nonce") ||
    params.has("__clerk_status") ||
    params.has("__clerk_created_session")
  );
}

function oauthCallbackSearchParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function restoreOAuthCallbackUrlIfNeeded(): void {
  if (typeof window === "undefined") return;
  const href = window.__SKOUN_OAUTH_HREF;
  if (!href) return;
  try {
    const snap = new URL(href);
    const now = new URL(window.location.href);
    const snapParams = snap.searchParams;
    const hasOAuth =
      snapParams.has("rotating_token_nonce") ||
      snapParams.has("__clerk_status") ||
      snapParams.has("__clerk_created_session");
    const nowHas =
      now.searchParams.has("rotating_token_nonce") ||
      now.searchParams.has("__clerk_status") ||
      now.searchParams.has("__clerk_created_session");
    if (hasOAuth && !nowHas && snap.pathname === now.pathname) {
      window.history.replaceState(
        window.history.state,
        "",
        `${snap.pathname}${snap.search}${snap.hash}`,
      );
    }
  } catch {
    // ignore malformed snapshots
  }
}

/**
 * Web Google/Facebook/Apple cannot use the Expo popup: Chrome's COOP
 * blocks window.closed, so startOAuthFlow never receives the nonce.
 * Full-page redirect via Clerk.authenticateWithRedirect is the reliable path.
 */
export async function startWebOAuthRedirect(
  clerk: ClerkLike,
  strategy: "oauth_google" | "oauth_facebook" | "oauth_apple",
  redirectUrl: string,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("OAuth redirect is only available in the browser.");
  }
  if (!clerk.client?.signIn) {
    throw new Error("Sign-in is not ready.");
  }

  rememberOAuthReturnTo();
  const completeUrl = `${window.location.origin}${peekOAuthReturnTo()}`;

  if (!clerk.client.signIn.create) {
    throw new Error("Sign-in is not ready.");
  }

  // Always start a new attempt. Continuing the previous one skips Google's
  // account picker and resumes a session whose token is already expired.
  // actionCompleteRedirectUrl is where Clerk returns after Google; without it
  // the dev instance drops the user on the hosted accounts.dev sign-in page.
  await clerk.client.signIn.create({
    strategy,
    redirectUrl,
    actionCompleteRedirectUrl: completeUrl,
  });
  const raw =
    clerk.client.signIn.firstFactorVerification?.externalVerificationRedirectURL;
  const oauthUrl = raw ? raw.toString() : "";
  if (!oauthUrl) {
    throw new Error("OAuth redirect URL was missing.");
  }
  window.location.assign(withAccountPicker(strategy, oauthUrl));
}

function withAccountPicker(
  strategy: "oauth_google" | "oauth_facebook" | "oauth_apple",
  oauthUrl: string,
): string {
  if (strategy !== "oauth_google") return oauthUrl;
  try {
    const url = new URL(oauthUrl);
    const host = url.hostname;
    if (host === "accounts.google.com" || host.endsWith(".google.com")) {
      url.searchParams.set("prompt", "select_account");
    }
    return url.toString();
  } catch {
    return oauthUrl;
  }
}

function navigateAfterOAuth(to: string): void {
  if (oauthDidNavigate) return;
  oauthDidNavigate = true;
  const next = consumeOAuthReturnTo();
  const dest =
    next && next !== "/"
      ? next
      : to && to !== "/oauth-native-callback"
        ? to
        : "/";
  if (/^https?:\/\//i.test(dest)) {
    window.location.replace(dest);
    return;
  }
  window.location.replace(dest.startsWith("/") ? dest : `/${dest}`);
}

/** Finish a full-page OAuth redirect that landed back on the app. */
export async function completeOAuthRedirectIfPresent(
  clerk: ClerkLike,
): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (!isOAuthCallbackLocation()) return false;
  if (oauthRedirectInFlight) return oauthRedirectInFlight;

  oauthRedirectInFlight = (async () => {
    if (typeof clerk.handleRedirectCallback === "function") {
      let navigated = false;
      const returnTo = peekOAuthReturnTo();
      await clerk.handleRedirectCallback(
        {
          transferable: true,
          signInFallbackRedirectUrl: returnTo,
          signUpFallbackRedirectUrl: returnTo,
        },
        (to: string) => {
          navigated = true;
          navigateAfterOAuth(to);
        },
      );
      if (navigated) return true;
      return activateClerkSession(clerk);
    }

    const nonce = oauthCallbackSearchParams().get("rotating_token_nonce");
    if (nonce && clerk.client?.signIn?.reload) {
      await clerk.client.signIn.reload({ rotatingTokenNonce: nonce });
    } else if (clerk.client?.signIn?.reload) {
      await clerk.client.signIn.reload();
    }
    const signIn = clerk.client?.signIn;
    const signUp = clerk.client?.signUp;
    const activated = await completeOAuthSession(clerk, { signIn, signUp });
    navigateAfterOAuth(peekOAuthReturnTo());
    return activated;
  })().finally(() => {
    oauthRedirectInFlight = null;
  });

  return oauthRedirectInFlight;
}
