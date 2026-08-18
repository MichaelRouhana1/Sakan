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
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { UserApiError } from "@/features/auth/userApi";
import {
  activateClerkSession,
  completeOAuthSession,
  isAlreadySignedInError,
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
type SignUpStep = "email" | "verify" | "password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clerkErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    errors?: { message?: string; code?: string }[];
    message?: string;
  };
  return anyErr?.errors?.[0]?.message || anyErr?.message || fallback;
}

function isClerkMinLengthError(err: unknown): boolean {
  return /15 characters or more/i.test(clerkErrorMessage(err, ""));
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

      let startFlow = startGoogleOAuth;
      if (provider === "facebook") startFlow = startFacebookOAuth;
      if (provider === "apple") startFlow = startAppleOAuth;

      const redirectUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/oauth-native-callback`
          : undefined;

      const res = await startFlow(redirectUrl ? { redirectUrl } : undefined);
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
          // fall through
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

export function SkounAuthModal({
  visible,
  onClose,
  onSuccess,
  title = "Sign in to Skoun",
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
    <SkounAuthModalClerk
      visible={visible}
      onClose={onClose}
      onSuccess={onSuccess}
      title={title}
    />
  );
}

function SkounAuthModalClerk({
  visible,
  onClose,
  onSuccess,
  title = "Sign in to Skoun",
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
    setShowPassword(false);
    setAuthMode("signIn");
    setSignUpStep("email");
    setEmail("");
    onClose();
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
      throw new Error("Could not load your Skoun account.");
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

  const validateEmailOnly = () => {
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) next.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const validatePasswordStep = () => {
    const next: Record<string, string> = {};
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
      if (result.status === "complete" && result.createdSessionId) {
        await activateClerkSession(clerk, result.createdSessionId);
        await finishAuth("email");
      } else {
        setError("Sign-in could not be completed. Try again.");
      }
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

  const handleEmailSignUp = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    if (!validateEmailOnly()) return;

    setLoading(true);
    setError(null);
    try {
      await clerk.client.signUp.create({
        emailAddress: email.trim().toLowerCase(),
      });
      await clerk.client.signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
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
      setPassword("");
      setPasswordConfirm("");
      setSignUpStep("password");
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
        setError(
          clerkErrorMessage(err, "Incorrect verification code or account sync failed."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    if (!validatePasswordStep()) return;

    setLoading(true);
    setError(null);
    try {
      const signUp = clerk.client.signUp as {
        update?: (args: { password: string }) => Promise<{
          status?: string;
          createdSessionId?: string | null;
        }>;
      };
      if (!signUp.update) {
        setError("Could not set password. Try again.");
        return;
      }
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
      setError("Password saved, but sign-up is not complete. Try again.");
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
      if (isClerkMinLengthError(err)) {
        try {
          await api.post("/api/auth/dev-set-password", {
            email: email.trim().toLowerCase(),
            password,
          });
          if (!clerk.client?.signIn) {
            setError("Password saved. Sign in with your new password.");
            return;
          }
          const signedIn = await clerk.client.signIn.create({
            identifier: email.trim().toLowerCase(),
            password,
          });
          if (signedIn.status === "complete" && signedIn.createdSessionId) {
            await activateClerkSession(clerk, signedIn.createdSessionId);
            await finishAuth("email");
            return;
          }
          setError("Password saved. Sign in with your new password.");
          return;
        } catch (inner) {
          const axiosErr = inner as {
            response?: { data?: { error?: { message?: string } } };
          };
          setError(
            axiosErr.response?.data?.error?.message ||
              clerkErrorMessage(
                inner,
                "Could not set password. Restart the API if this persists.",
              ),
          );
          return;
        }
      }
      setError(clerkErrorMessage(err, "Could not set password."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    setLoading(true);
    setError(null);
    try {
      await clerk.client.signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not resend code."));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const modalTitle =
    authMode === "signUp"
      ? signUpStep === "verify"
        ? "Verify your email"
        : signUpStep === "password"
          ? "Create a password"
          : "Create your account"
      : title;

  const modalSubtitle =
    authMode === "signUp"
      ? signUpStep === "verify"
        ? `Enter the code sent to ${email.trim().toLowerCase()}`
        : signUpStep === "password"
          ? "Choose a strong password to finish signing up"
          : "Enter your email, then verify it"
      : "Welcome back! Sign in to continue";

  const showOAuth =
    authMode === "signIn" || (authMode === "signUp" && signUpStep === "email");
  const passwordReady =
    passwordMeetsPolicy(password) &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const primaryDisabled =
    loading ||
    (authMode === "signIn" && (!email.trim() || !password)) ||
    (authMode === "signUp" && signUpStep === "email" && !email.trim()) ||
    (authMode === "signUp" &&
      signUpStep === "verify" &&
      verificationCode.length < 6) ||
    (authMode === "signUp" && signUpStep === "password" && !passwordReady);

  const primaryLabel =
    authMode === "signUp"
      ? signUpStep === "verify"
        ? "Verify email"
        : signUpStep === "password"
          ? "Create account"
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

                {authMode === "signUp" && signUpStep === "verify" ? (
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

                {authMode === "signUp" && signUpStep === "password" ? (
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
                  </>
                ) : null}

                {authMode === "signIn" ||
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
                      <View
                        nativeID="clerk-captcha"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={styles.captchaMount}
                      />
                    )}
                  </>
                ) : null}

                {lastUsedProvider === "email" && showOAuth ? (
                  <Text style={styles.lastUsedHint}>
                    Email was last used on this device
                  </Text>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  onPress={() => {
                    if (authMode === "signUp" && signUpStep === "verify") {
                      void handleVerifySignUp();
                      return;
                    }
                    if (authMode === "signUp" && signUpStep === "password") {
                      void handleSetPassword();
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

                {authMode === "signUp" && signUpStep === "verify" ? (
                  <>
                    <Pressable
                      onPress={() => void handleResendCode()}
                      style={styles.backLinkWrap}
                    >
                      <Text style={styles.backLink}>Resend code</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSignUpStep("email");
                        setVerificationCode("");
                        setError(null);
                      }}
                      style={styles.backLinkWrap}
                    >
                      <Text style={styles.backLink}>Back to email</Text>
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
                    setSignUpStep("email");
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
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
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
    fontFamily: Skoun.type.bodyBold,
    fontSize: 24,
    color: "#09090B",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Skoun.type.body,
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
    fontFamily: Skoun.type.bodyMedium,
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
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: "#71717A",
  },
  lastUsedHint: {
    fontFamily: Skoun.type.body,
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
    fontFamily: Skoun.type.body,
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
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#09090B",
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  showHideText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: "#18181B",
    letterSpacing: 0.6,
  },
  input: {
    fontFamily: Skoun.type.body,
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
    borderColor: Skoun.color.danger,
  },
  fieldErrorText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.danger,
  },
  errorText: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.danger,
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
    fontFamily: Skoun.type.bodyBold,
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
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: "#71717A",
    textDecorationLine: "underline",
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
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#71717A",
  },
  signUpLink: {
    fontFamily: Skoun.type.bodySemi,
    color: "#09090B",
    textDecorationLine: "underline",
  },
});
