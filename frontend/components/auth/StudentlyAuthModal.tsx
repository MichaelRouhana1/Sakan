import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useClerk, useOAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";

import { api } from "@/lib/api";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Studently } from "@/constants/theme";
import { studentlyShadow } from "@/lib/studentlyShadow";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { UserApiError } from "@/features/auth/userApi";
import {
  activateClerkSession,
  completeOAuthSession,
  isAlreadySignedInError,
  startWebOAuthRedirect,
} from "@/lib/clerkAuth";
import {
  CLERK_SETUP_MESSAGE,
  useClerkEnabled,
} from "@/lib/clerkEnabled";
import {
  passwordMeetsPolicy,
  passwordMismatch,
} from "@/lib/passwordStrength";
import {
  getLastAuthProvider,
  setLastAuthProvider,
  setPendingAuthProvider,
  type AuthProvider,
} from "@/lib/session";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (userId: string) => void;
  title?: string;
};

type AuthMode = "signIn" | "signUp";
type SignUpStep = "email" | "verify";
type SignInStep = "credentials" | "verify";
type SignInCodeFactor = "first" | "second";

type ClerkEmailFactor = { strategy?: string; emailAddressId?: string };

function emailCodeFactor(factors: ClerkEmailFactor[] | null | undefined) {
  return factors?.find((factor) => factor.strategy === "email_code");
}

/** Password can finish, or Clerk can ask for an email code (client trust or another factor). */
async function prepareSignInEmailCode(signIn: {
  status: string | null;
  supportedFirstFactors: ClerkEmailFactor[] | null;
  supportedSecondFactors: ClerkEmailFactor[] | null;
  prepareFirstFactor: (params: {
    strategy: "email_code";
    emailAddressId: string;
  }) => Promise<unknown>;
  prepareSecondFactor: (params: {
    strategy: "email_code";
    emailAddressId?: string;
  }) => Promise<unknown>;
}): Promise<SignInCodeFactor | null> {
  const status = signIn.status ?? "";
  if (status === "needs_first_factor") {
    const factor = emailCodeFactor(signIn.supportedFirstFactors);
    if (!factor?.emailAddressId) return null;
    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId,
    });
    return "first";
  }
  if (status === "needs_second_factor" || status === "needs_client_trust") {
    const factor = emailCodeFactor(signIn.supportedSecondFactors);
    if (factor?.emailAddressId) {
      await signIn.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
    } else {
      await signIn.prepareSecondFactor({ strategy: "email_code" });
    }
    return "second";
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CODE_WRONG =
  "That code doesn't match the latest email. Use the newest message, or tap Resend code.";
const CODE_LOCKED =
  "Too many tries. This code is no longer valid — tap Resend code and use only that email.";
const CODE_EXPIRED = "That code expired. Tap Resend code and use the new email.";
const CODE_RATE =
  "Too many attempts right now. Wait a minute, then tap Resend code.";

type ClerkAPIErrorLike = {
  code?: string;
  message?: string;
  longMessage?: string;
  long_message?: string;
};

function clerkErrors(err: unknown): ClerkAPIErrorLike[] {
  const anyErr = err as { errors?: ClerkAPIErrorLike[]; message?: string; code?: string };
  if (Array.isArray(anyErr?.errors) && anyErr.errors.length > 0) return anyErr.errors;
  if (anyErr?.code || anyErr?.message) return [anyErr];
  return [];
}

function clerkErrorCode(err: unknown): string {
  return clerkErrors(err)[0]?.code ?? "";
}

function clerkErrorMessage(err: unknown, fallback: string): string {
  const first = clerkErrors(err)[0];
  const long = first?.longMessage || first?.long_message;
  if (long?.trim()) return long.trim();
  const short = first?.message?.trim();
  // Clerk's short message is a fragment ("is incorrect", "failed") meant to follow a field label.
  if (short && !/^(is incorrect|incorrect|failed)$/i.test(short)) return short;
  return fallback;
}

function verificationAttemptError(err: unknown): { message: string; lock: boolean } {
  const first = clerkErrors(err)[0];
  const code = first?.code ?? "";
  const short = first?.message?.trim() ?? "";
  const long = clerkErrorMessage(err, "");
  if (
    code === "verification_failed" ||
    /^failed$/i.test(short) ||
    /too many failed attempts/i.test(long)
  ) {
    return { message: CODE_LOCKED, lock: true };
  }
  if (code === "verification_expired" || /expired/i.test(long) || /expired/i.test(short)) {
    return { message: CODE_EXPIRED, lock: true };
  }
  if (code === "too_many_requests" || code === "rate_limit_exceeded") {
    return { message: CODE_RATE, lock: true };
  }
  if (
    code === "form_code_incorrect" ||
    /^is incorrect$/i.test(short) ||
    /incorrect/i.test(long)
  ) {
    return { message: CODE_WRONG, lock: false };
  }
  return {
    message: long || "That code was not accepted. Tap Resend code and try the newest email.",
    lock: false,
  };
}

function isClerkMinLengthError(err: unknown): boolean {
  return (
    clerkErrorCode(err) === "form_password_length_too_short" ||
    /15 characters or more/i.test(clerkErrorMessage(err, ""))
  );
}

function ClerkOAuthSection({
  loading,
  lastUsedProvider,
  setLoading,
  setError,
  onOAuthComplete,
}: {
  loading: boolean;
  lastUsedProvider: AuthProvider | null;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  onOAuthComplete: (provider: AuthProvider) => Promise<void>;
}) {
  const clerk = useClerk();
  const { logout } = useAuthSession();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({
    strategy: "oauth_facebook",
  });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });

  const renderLastUsedBadge = (provider: AuthProvider) => {
    if (lastUsedProvider !== provider) return null;
    return (
      <View style={styles.lastUsedBadge}>
        <Text style={styles.lastUsedText}>Last used</Text>
      </View>
    );
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoading(true);
    setError(null);

    try {
      await setPendingAuthProvider(provider);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        await startWebOAuthRedirect(
          clerk,
          `oauth_${provider}`,
          `${window.location.origin}/oauth-native-callback`,
        );
        return;
      }

      let startFlow = startGoogleOAuth;
      if (provider === "facebook") startFlow = startFacebookOAuth;
      if (provider === "apple") startFlow = startAppleOAuth;

      const res = await startFlow();
      if (
        res.authSessionResult?.type === "cancel" ||
        res.authSessionResult?.type === "dismiss"
      ) {
        return;
      }
      const activated = await completeOAuthSession(clerk, res);

      if (activated || clerk?.session) {
        await onOAuthComplete(provider);
        return;
      }

      throw new Error(
        `${provider} authentication did not finish. Try again.`,
      );
    } catch (err: unknown) {
      console.error("OAuth error:", err);
      if (isAlreadySignedInError(err)) {
        try {
          await activateClerkSession(clerk);
          await onOAuthComplete(provider);
          return;
        } catch {
          await logout();
          setError("Signed out of the stuck session. Sign in again.");
          return;
        }
      }
      setError(
        clerkErrorMessage(
          err,
          `${provider} authentication failed. Please try again.`,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.socialCol}>
        <View style={styles.socialBtnWrapper}>
          <Pressable
            disabled={loading}
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && styles.pressed,
              loading && styles.btnDisabled,
            ]}
            onPress={() => handleOAuth("google")}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </Pressable>
          {renderLastUsedBadge("google")}
        </View>

        <View style={styles.socialBtnWrapper}>
          <Pressable
            disabled={loading}
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && styles.pressed,
              loading && styles.btnDisabled,
            ]}
            onPress={() => handleOAuth("apple")}
          >
            <Ionicons name="logo-apple" size={18} color="#000000" />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </Pressable>
          {renderLastUsedBadge("apple")}
        </View>

        <View style={styles.socialBtnWrapper}>
          <Pressable
            disabled={loading}
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && styles.pressed,
              loading && styles.btnDisabled,
            ]}
            onPress={() => handleOAuth("facebook")}
          >
            <Ionicons name="logo-facebook" size={18} color="#1877F2" />
            <Text style={styles.socialBtnText}>Continue with Facebook</Text>
          </Pressable>
          {renderLastUsedBadge("facebook")}
        </View>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
}

export function StudentlyAuthModal({
  visible,
  onClose,
  onSuccess,
  title = "Sign in to Studently",
}: Props) {
  const clerkEnabled = useClerkEnabled();

  if (!visible) return null;

  if (!clerkEnabled) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.modalCard}>
            <View style={styles.contentPadding}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.errorText}>{CLERK_SETUP_MESSAGE}</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <StudentlyAuthModalClerk
      visible={visible}
      onClose={onClose}
      onSuccess={onSuccess}
      title={title}
    />
  );
}

function StudentlyAuthModalClerk({
  visible,
  onClose,
  onSuccess,
  title = "Sign in to Studently",
}: Props) {
  const clerk = useClerk();
  const { syncWithBackend } = useAuthSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("email");
  const [signInStep, setSignInStep] = useState<SignInStep>("credentials");
  const [signInFactor, setSignInFactor] = useState<SignInCodeFactor>("second");
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const [rejectedCode, setRejectedCode] = useState<string | null>(null);
  const [codeLocked, setCodeLocked] = useState(false);
  const [passwordDeferred, setPasswordDeferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastUsedProvider, setLastUsedProvider] = useState<AuthProvider | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getLastAuthProvider().then((provider) => {
      if (!cancelled) setLastUsedProvider(provider);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    setLoading(false);
    setPassword("");
    setPasswordConfirm("");
    setVerificationCode("");
    setRejectedCode(null);
    setCodeLocked(false);
    setPasswordDeferred(false);
    setShowPassword(false);
    setAuthMode("signIn");
    setSignUpStep("email");
    setSignInStep("credentials");
    setSignInFactor("second");
    setCodeNotice(null);
    setEmail("");
    onClose();
  };

  const openSignInCodeStep = async (signIn: NonNullable<NonNullable<typeof clerk.client>["signIn"]>) => {
    const factor = await prepareSignInEmailCode(signIn);
    if (!factor) {
      setError("Sign-in could not be completed. Try again.");
      return false;
    }
    setAuthMode("signIn");
    setSignInFactor(factor);
    setVerificationCode("");
    setRejectedCode(null);
    setCodeLocked(false);
    setSignInStep("verify");
    setCodeNotice(null);
    setFieldErrors({});
    setError(null);
    return true;
  };

  const completeSignInAttempt = async (
    result: NonNullable<NonNullable<typeof clerk.client>["signIn"]>,
  ) => {
    if (result.status === "complete" && result.createdSessionId) {
      await activateClerkSession(clerk, result.createdSessionId);
      await finishAuth("email");
      return;
    }
    const opened = await openSignInCodeStep(result);
    if (!opened) return;
  };

  const finishAuth = async (provider: AuthProvider) => {
    await setLastAuthProvider(provider);
    setLastUsedProvider(provider);

    let me = await syncWithBackend();
    if (!me) {
      for (let attempt = 0; attempt < 4; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
        me = await syncWithBackend();
        if (me) break;
      }
    }

    if (!me) {
      throw new Error("Could not load your Studently account.");
    }
    onSuccess?.(me.id);
    handleClose();
  };

  const handleOAuthComplete = async (provider: AuthProvider) => {
    try {
      await finishAuth(provider);
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not complete sign-in.");
      }
    }
  };

  const validateSignUpDetails = () => {
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) next.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }
    if (!passwordMeetsPolicy(password)) {
      next.password =
        "Use 8+ characters with upper, lower, number, and a special character.";
    }
    if (!passwordConfirm) next.passwordConfirm = "Confirm your password.";
    else if (password !== passwordConfirm) {
      next.passwordConfirm = "Passwords do not match.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const createSignUpAttempt = async () => {
    const emailAddress = email.trim().toLowerCase();
    const signUp = clerk.client!.signUp;
    try {
      await signUp.create({ emailAddress, password });
      return false;
    } catch (err) {
      if (!isClerkMinLengthError(err)) throw err;
    }
    await signUp.create({ emailAddress });
    return true;
  };

  const validateEmailPassword = () => {
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) next.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }
    if (!password) next.password = "Password is required.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const finishExistingSession = async (provider: AuthProvider) => {
    await activateClerkSession(clerk);
    await finishAuth(provider);
  };

  const handleEmailSignIn = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signIn) return;
    if (!validateEmailPassword()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await clerk.client.signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      await completeSignInAttempt(result);
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        try {
          await finishExistingSession("email");
          return;
        } catch (inner) {
          if (inner instanceof UserApiError) {
            setError(inner.message);
            return;
          }
        }
      }
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        setError(clerkErrorMessage(err, "Could not sign in."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignIn = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signIn) return;
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ code: "Enter the 6-digit verification code." });
      return;
    }
    if (codeLocked) {
      setFieldErrors({ code: CODE_LOCKED });
      return;
    }
    if (rejectedCode === code) {
      setFieldErrors({ code: CODE_WRONG });
      return;
    }
    const signIn = clerk.client.signIn;
    const factorVerification = (
      signIn as {
        firstFactorVerification?: { status?: string | null };
        secondFactorVerification?: { status?: string | null };
      }
    )[signInFactor === "first" ? "firstFactorVerification" : "secondFactorVerification"];
    if (factorVerification?.status === "failed" || factorVerification?.status === "expired") {
      setCodeLocked(true);
      setFieldErrors({
        code: factorVerification.status === "expired" ? CODE_EXPIRED : CODE_LOCKED,
      });
      return;
    }
    setLoading(true);
    setError(null);
    setCodeNotice(null);
    setFieldErrors({});
    try {
      const result =
        signInFactor === "first"
          ? await signIn.attemptFirstFactor({ strategy: "email_code", code })
          : await signIn.attemptSecondFactor({ strategy: "email_code", code });
      await completeSignInAttempt(result);
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        try {
          await finishExistingSession("email");
          return;
        } catch (inner) {
          setError(
            inner instanceof UserApiError
              ? inner.message
              : clerkErrorMessage(inner, "Could not sign in."),
          );
          return;
        }
      }
      const attempt = verificationAttemptError(err);
      if (attempt.lock) {
        setCodeLocked(true);
        setRejectedCode(null);
      } else if (attempt.message === CODE_WRONG) {
        setRejectedCode(code);
      }
      setFieldErrors({ code: attempt.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignInCode = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signIn) return;
    setLoading(true);
    setError(null);
    try {
      const factor = await prepareSignInEmailCode(clerk.client.signIn);
      if (!factor) {
        setError("Could not resend the code. Try again.");
        return;
      }
      setSignInFactor(factor);
      setVerificationCode("");
      setRejectedCode(null);
      setCodeLocked(false);
      setFieldErrors({});
      setCodeNotice(
        `We sent a new code to ${email.trim().toLowerCase()}. Earlier codes no longer work.`,
      );
    } catch (err) {
      const attempt = verificationAttemptError(err);
      if (attempt.lock || clerkErrorCode(err) === "too_many_requests") {
        setFieldErrors({ code: attempt.message });
      } else {
        setError(clerkErrorMessage(err, "Could not resend the code."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    if (!validateSignUpDetails()) return;

    setLoading(true);
    setError(null);
    try {
      const deferred = await createSignUpAttempt();
      await clerk.client.signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setPasswordDeferred(deferred);
      setVerificationCode("");
      setRejectedCode(null);
      setCodeLocked(false);
      setCodeNotice(null);
      setSignUpStep("verify");
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not start sign-up."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUp = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ code: "Enter the 6-digit verification code." });
      return;
    }

    if (codeLocked) {
      setFieldErrors({ code: CODE_LOCKED });
      return;
    }
    if (rejectedCode === code) {
      setFieldErrors({ code: CODE_WRONG });
      return;
    }
    const emailStatus =
      (
        clerk.client.signUp as {
          verifications?: { emailAddress?: { status?: string | null } };
        }
      ).verifications?.emailAddress?.status ?? "";
    if (emailStatus === "failed" || emailStatus === "expired") {
      setCodeLocked(true);
      setFieldErrors({
        code: emailStatus === "expired" ? CODE_EXPIRED : CODE_LOCKED,
      });
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({
        code,
      });
      const sessionId = result.createdSessionId;
      if (result.status === "complete" && sessionId) {
        await activateClerkSession(clerk, sessionId);
        await finishAuth("email");
        return;
      }
      if (sessionId) {
        await activateClerkSession(clerk, sessionId);
        await finishAuth("email");
        return;
      }
      const missing =
        (result as { missingFields?: string[] }).missingFields ?? [];
      if (passwordDeferred || missing.includes("password")) {
        await applyDeferredPassword();
        return;
      }
      setError("Sign-up is not complete. Try again.");
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        try {
          await finishExistingSession("email");
          return;
        } catch (inner) {
          setError(
            inner instanceof UserApiError
              ? inner.message
              : clerkErrorMessage(inner, "Could not finish sign-up."),
          );
          return;
        }
      }
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        const attempt = verificationAttemptError(err);
        if (attempt.lock) {
          setCodeLocked(true);
          setRejectedCode(null);
        } else if (attempt.message === CODE_WRONG) {
          setRejectedCode(code);
        }
        setFieldErrors({ code: attempt.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const applyDeferredPassword = async () => {
    if (!clerk.loaded || !clerk.client?.signUp) {
      setError("Could not finish sign-up. Try again.");
      return;
    }

    const signUp = clerk.client.signUp as {
      update?: (args: { password: string }) => Promise<{
        status?: string;
        createdSessionId?: string | null;
      }>;
    };

    try {
      if (signUp.update) {
        try {
          const result = await signUp.update({ password });
          const sessionId = result.createdSessionId;
          if ((result.status === "complete" || sessionId) && sessionId) {
            await activateClerkSession(clerk, sessionId);
            await finishAuth("email");
            return;
          }
          if (result.status === "complete") {
            await activateClerkSession(clerk);
            await finishAuth("email");
            return;
          }
        } catch (err) {
          if (isAlreadySignedInError(err)) {
            await finishExistingSession("email");
            return;
          }
          if (!isClerkMinLengthError(err)) throw err;
        }
      }

      try {
        await api.post("/api/auth/dev-set-password", {
          email: email.trim().toLowerCase(),
          password,
        });
      } catch (inner) {
        const axiosErr = inner as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message = axiosErr.response?.data?.error?.message || "";
        if (!/already set/i.test(message)) {
          setError(
            message ||
              clerkErrorMessage(
                inner,
                "Could not set password. Restart the API if this persists.",
              ),
          );
          return;
        }
      }

      if (!clerk.client?.signIn) {
        setAuthMode("signIn");
        setSignInStep("credentials");
        setSignUpStep("email");
        setError("Account created. Sign in with your email and password.");
        return;
      }
      const signedIn = await clerk.client.signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      await completeSignInAttempt(signedIn);
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        try {
          await finishExistingSession("email");
          return;
        } catch (inner) {
          setError(
            inner instanceof UserApiError
              ? inner.message
              : clerkErrorMessage(inner, "Could not finish sign-up."),
          );
          return;
        }
      }
      setError(clerkErrorMessage(err, "Could not set password."));
    }
  };

  const handleResendCode = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    setLoading(true);
    setError(null);
    try {
      const signUp = clerk.client.signUp;
      const signupStatus = (signUp as { status?: string | null }).status;
      if (!signUp.id || signupStatus === "abandoned") {
        setPasswordDeferred(await createSignUpAttempt());
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerificationCode("");
      setRejectedCode(null);
      setCodeLocked(false);
      setFieldErrors({});
      setCodeNotice(
        `We sent a new code to ${email.trim().toLowerCase()}. Earlier codes no longer work.`,
      );
    } catch (err) {
      const code = clerkErrorCode(err);
      if (
        code === "resource_not_found" ||
        code === "sign_up_forbidden_access" ||
        /abandoned/i.test(clerkErrorMessage(err, ""))
      ) {
        try {
          setPasswordDeferred(await createSignUpAttempt());
          await clerk.client.signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setVerificationCode("");
          setRejectedCode(null);
          setCodeLocked(false);
          setFieldErrors({});
          setCodeNotice(
            `We sent a new code to ${email.trim().toLowerCase()}. Earlier codes no longer work.`,
          );
          return;
        } catch (inner) {
          setError(clerkErrorMessage(inner, "Could not resend code."));
          return;
        }
      }
      const attempt = verificationAttemptError(err);
      if (code === "too_many_requests" || code === "rate_limit_exceeded" || attempt.lock) {
        setFieldErrors({ code: attempt.message });
      } else {
        setError(clerkErrorMessage(err, "Could not resend code."));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const verifyingSignIn = authMode === "signIn" && signInStep === "verify";
  const verifyingSignUp = authMode === "signUp" && signUpStep === "verify";

  const modalTitle = verifyingSignIn
    ? "Check your email"
    : authMode === "signUp"
      ? signUpStep === "verify"
        ? "Verify your email"
        : "Create your account"
      : title;

  const modalSubtitle = verifyingSignIn
    ? `Enter the code sent to ${email.trim().toLowerCase()}`
    : authMode === "signUp"
      ? signUpStep === "verify"
        ? `Enter the code sent to ${email.trim().toLowerCase()}`
        : "Enter your email and a password. We'll send a code next."
      : "Welcome back! Sign in to continue";

  const showOAuth =
    (authMode === "signIn" && signInStep === "credentials") ||
    (authMode === "signUp" && signUpStep === "email");
  const passwordReady =
    passwordMeetsPolicy(password) &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const primaryDisabled =
    loading ||
    (authMode === "signIn" &&
      signInStep === "credentials" &&
      (!email.trim() || !password)) ||
    (verifyingSignIn &&
      (codeLocked ||
        verificationCode.length < 6 ||
        verificationCode.trim() === rejectedCode)) ||
    (authMode === "signUp" &&
      signUpStep === "email" &&
      (!email.trim() || !passwordReady)) ||
    (authMode === "signUp" &&
      signUpStep === "verify" &&
      (codeLocked ||
        verificationCode.length < 6 ||
        verificationCode.trim() === rejectedCode));

  const primaryLabel = verifyingSignIn
    ? "Verify email"
    : authMode === "signUp"
      ? signUpStep === "verify"
        ? "Verify email"
        : "Continue"
      : "Sign in";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modalCard}>
          <Pressable
            onPress={handleClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </Pressable>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contentPadding}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.title}>{modalTitle}</Text>
              <Text style={styles.subtitle}>{modalSubtitle}</Text>
            </View>

            <View style={styles.body}>
                {showOAuth ? (
                  <ClerkOAuthSection
                    loading={loading}
                    lastUsedProvider={lastUsedProvider}
                    setLoading={setLoading}
                    setError={setError}
                    onOAuthComplete={handleOAuthComplete}
                  />
                ) : null}

                {verifyingSignIn || verifyingSignUp ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Verification code</Text>
                    <TextInput
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="6-digit code"
                      placeholderTextColor="#A1A1AA"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[
                        styles.input,
                        fieldErrors.code ? styles.inputError : null,
                      ]}
                    />
                    {fieldErrors.code ? (
                      <Text style={styles.fieldErrorText}>
                        {fieldErrors.code}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {(authMode === "signIn" && signInStep === "credentials") ||
                (authMode === "signUp" && signUpStep === "email") ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email address</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email address"
                        placeholderTextColor="#A1A1AA"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[
                          styles.input,
                          fieldErrors.email ? styles.inputError : null,
                        ]}
                      />
                      {fieldErrors.email ? (
                        <Text style={styles.fieldErrorText}>
                          {fieldErrors.email}
                        </Text>
                      ) : null}
                    </View>

                    {authMode === "signIn" ? (
                      <View style={styles.inputGroup}>
                        <View style={styles.passwordLabelRow}>
                          <Text style={styles.inputLabel}>Password</Text>
                          <Pressable
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={8}
                          >
                            <Text style={styles.showHideText}>
                              {showPassword ? "HIDE" : "SHOW"}
                            </Text>
                          </Pressable>
                        </View>
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          placeholderTextColor="#A1A1AA"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          textContentType="password"
                          style={[
                            styles.input,
                            fieldErrors.password ? styles.inputError : null,
                          ]}
                        />
                        {fieldErrors.password ? (
                          <Text style={styles.fieldErrorText}>
                            {fieldErrors.password}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <>
                        <View style={styles.inputGroup}>
                          <View style={styles.passwordLabelRow}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <Pressable
                              onPress={() => setShowPassword((v) => !v)}
                              hitSlop={8}
                            >
                              <Text style={styles.showHideText}>
                                {showPassword ? "HIDE" : "SHOW"}
                              </Text>
                            </Pressable>
                          </View>
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Create a password"
                            placeholderTextColor="#A1A1AA"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                            style={[
                              styles.input,
                              fieldErrors.password ? styles.inputError : null,
                            ]}
                          />
                          <PasswordStrengthMeter password={password} />
                          {fieldErrors.password ? (
                            <Text style={styles.fieldErrorText}>
                              {fieldErrors.password}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Confirm password</Text>
                          <TextInput
                            value={passwordConfirm}
                            onChangeText={setPasswordConfirm}
                            placeholder="Re-enter your password"
                            placeholderTextColor="#A1A1AA"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                            style={[
                              styles.input,
                              fieldErrors.passwordConfirm ||
                              passwordMismatch(password, passwordConfirm)
                                ? styles.inputError
                                : null,
                            ]}
                          />
                          {fieldErrors.passwordConfirm ? (
                            <Text style={styles.fieldErrorText}>
                              {fieldErrors.passwordConfirm}
                            </Text>
                          ) : passwordMismatch(password, passwordConfirm) ? (
                            <Text style={styles.fieldErrorText}>
                              Passwords do not match.
                            </Text>
                          ) : null}
                        </View>
                        <View
                          nativeID="clerk-captcha"
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={styles.captchaMount}
                        />
                      </>
                    )}
                  </>
                ) : null}

                {lastUsedProvider === "email" && showOAuth ? (
                  <Text style={styles.lastUsedHint}>
                    Email was last used on this device
                  </Text>
                ) : null}

                {codeNotice && !error ? (
                  <Text style={styles.lastUsedHint}>{codeNotice}</Text>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  onPress={() => {
                    if (verifyingSignIn) {
                      void handleVerifySignIn();
                      return;
                    }
                    if (authMode === "signUp" && signUpStep === "verify") {
                      void handleVerifySignUp();
                      return;
                    }
                    if (authMode === "signUp") {
                      void handleEmailSignUp();
                      return;
                    }
                    void handleEmailSignIn();
                  }}
                  disabled={primaryDisabled}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    primaryDisabled && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                      <Text style={styles.btnChevron}>▸</Text>
                    </View>
                  )}
                </Pressable>

                {verifyingSignIn ? (
                  <>
                    <Pressable
                      onPress={() => void handleResendSignInCode()}
                      style={styles.backLinkWrap}
                    >
                      <Text style={[styles.backLink, codeLocked && styles.backLinkEmphasis]}>
                        Resend code
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSignInStep("credentials");
                        setVerificationCode("");
                        setRejectedCode(null);
                        setCodeLocked(false);
                        setCodeNotice(null);
                        setError(null);
                        setFieldErrors({});
                      }}
                      style={styles.backLinkWrap}
                    >
                      <Text style={styles.backLink}>Back to password</Text>
                    </Pressable>
                  </>
                ) : null}

                {authMode === "signUp" && signUpStep === "verify" ? (
                  <>
                    <Pressable
                      onPress={() => void handleResendCode()}
                      style={styles.backLinkWrap}
                    >
                      <Text style={[styles.backLink, codeLocked && styles.backLinkEmphasis]}>
                        Resend code
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSignUpStep("email");
                        setVerificationCode("");
                        setRejectedCode(null);
                        setCodeLocked(false);
                        setError(null);
                        setFieldErrors({});
                      }}
                      style={styles.backLinkWrap}
                    >
                      <Text style={styles.backLink}>Back</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
          </ScrollView>

          {authMode === "signIn" || signUpStep === "email" ? (
            <View style={styles.footerCard}>
              <Text style={styles.footerText}>
                {authMode === "signUp"
                  ? "Already have an account? "
                  : "Don’t have an account? "}
                <Text
                  style={styles.signUpLink}
                  onPress={() => {
                    setAuthMode(authMode === "signUp" ? "signIn" : "signUp");
                    setError(null);
                    setFieldErrors({});
                    setPassword("");
                    setPasswordConfirm("");
                    setVerificationCode("");
                    setPasswordDeferred(false);
                    setSignUpStep("email");
                    setSignInStep("credentials");
                  }}
                >
                  {authMode === "signUp" ? "Sign in" : "Sign up"}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    ...studentlyShadow({ color: "#000000", y: 10, blur: 30, opacity: 0.12, elevation: 14 }),
    overflow: "hidden",
    position: "relative",
    maxHeight: "92%",
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  contentPadding: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 24,
    color: "#09090B",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    marginTop: 6,
  },
  body: {
    gap: 16,
  },
  socialCol: {
    gap: 12,
  },
  socialBtnWrapper: {
    position: "relative",
  },
  socialBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialBtnText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    color: "#18181B",
  },
  lastUsedBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  lastUsedText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 11,
    color: "#71717A",
  },
  lastUsedHint: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    color: "#A1A1AA",
    marginTop: -6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4E4E7",
  },
  dividerText: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    color: "#A1A1AA",
    paddingHorizontal: 16,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  captchaMount: {
    minHeight: 1,
    width: "100%",
  },
  inputLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    color: "#09090B",
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  showHideText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    color: "#18181B",
    letterSpacing: 0.6,
  },
  input: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: "#09090B",
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: Studently.color.danger,
  },
  fieldErrorText: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    color: Studently.color.danger,
  },
  errorText: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    color: Studently.color.danger,
    marginTop: -2,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#18181B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnChevron: {
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 1,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.88,
  },
  backLinkWrap: {
    alignItems: "center",
  },
  backLink: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    color: "#71717A",
    textDecorationLine: "underline",
  },
  backLinkEmphasis: {
    fontFamily: Studently.type.bodyBold,
    color: "#09090B",
  },
  footerCard: {
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderColor: "#F4F4F5",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: "#71717A",
  },
  signUpLink: {
    fontFamily: Studently.type.bodySemi,
    color: "#09090B",
    textDecorationLine: "underline",
  },
});
