import { Platform } from "react-native";

type ClerkSessionLike = {
  id?: string;
  getToken?: (opts?: { skipCache?: boolean }) => Promise<string | null>;
};

type ClerkLike = {
  session?: ClerkSessionLike | null;
  setActive?: (args: { session: string }) => Promise<unknown>;
  client?: {
    signIn?: {
      reload?: (args: { rotatingTokenNonce: string }) => Promise<unknown>;
      status?: string;
      createdSessionId?: string | null;
      firstFactorVerification?: { status?: string | null };
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

export async function waitForClerkToken(
  clerk: ClerkLike,
  tries = 10,
): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const token = await clerk.session?.getToken?.({ skipCache: i > 0 });
      if (token) return token;
    } catch {
      // session object may not be ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 80 * (i + 1)));
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

/** Finish a full-page OAuth redirect that landed back on the app with a nonce. */
export async function completeOAuthRedirectIfPresent(
  clerk: ClerkLike,
): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const nonce = params.get("rotating_token_nonce");
  if (!nonce || !clerk.client?.signIn?.reload) return false;

  await clerk.client.signIn.reload({ rotatingTokenNonce: nonce });
  const signIn = clerk.client.signIn;
  const signUp = clerk.client.signUp;
  const activated = await completeOAuthSession(clerk, { signIn, signUp });

  const next = new URL(window.location.href);
  next.searchParams.delete("rotating_token_nonce");
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
  return activated;
}
