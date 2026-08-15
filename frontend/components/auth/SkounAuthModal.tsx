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

import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  CLERK_SETUP_MESSAGE,
  useClerkEnabled,
} from "@/lib/clerkEnabled";
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
type SignUpStep = "form" | "verify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clerkErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    errors?: { message?: string; code?: string }[];
    message?: string;
  };
  return anyErr?.errors?.[0]?.message || anyErr?.message || fallback;
}

function isAlreadySignedInError(err: unknown): boolean {
  const anyErr = err as {
    errors?: { message?: string; code?: string }[];
    message?: string;
  };
  const code = anyErr?.errors?.[0]?.code;
  const msg = (
    anyErr?.errors?.[0]?.message ||
    anyErr?.message ||
    ""
  ).toLowerCase();
  return (
    code === "session_exists" ||
    msg.includes("already signed in") ||
    msg.includes("session already exists")
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

  const handleClearStaleSession = async (): Promise<void> => {
    try {
      if (clerk?.signOut) {
        await clerk.signOut();
      }
    } catch {
      // ignore
    }
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoading(true);
    setError(null);

    try {
      const strategy = `oauth_${provider}` as
        | "oauth_google"
        | "oauth_facebook"
        | "oauth_apple";

      await setPendingAuthProvider(provider);

      if (Platform.OS === "web" && clerk?.client?.signIn) {
        const redirectUrl =
          typeof window !== "undefined" ? window.location.origin : "/";
        try {
          await clerk.client.signIn.authenticateWithRedirect({
            strategy,
            redirectUrl,
            redirectUrlComplete: redirectUrl,
          });
          return;
        } catch (redirectErr: unknown) {
          if (isAlreadySignedInError(redirectErr)) {
            await handleClearStaleSession();
            await clerk.client.signIn.authenticateWithRedirect({
              strategy,
              redirectUrl,
              redirectUrlComplete: redirectUrl,
            });
            return;
          }
          throw redirectErr;
        }
      }

      let startFlow = startGoogleOAuth;
      if (provider === "facebook") startFlow = startFacebookOAuth;
      if (provider === "apple") startFlow = startAppleOAuth;

      const res = await startFlow();
      if (res?.createdSessionId && res?.setActive) {
        await res.setActive({ session: res.createdSessionId });
      }

      if (clerk?.session) {
        await onOAuthComplete(provider);
        return;
      }
    } catch (err: unknown) {
      console.error("OAuth error:", err);
      if (isAlreadySignedInError(err) && clerk?.session) {
        try {
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("form");
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
    setVerificationCode("");
    setShowPassword(false);
    setAuthMode("signIn");
    setSignUpStep("form");
    setEmail("");
    setFirstName("");
    setLastName("");
    onClose();
  };

  const finishAuth = async (provider: AuthProvider) => {
    await setLastAuthProvider(provider);
    setLastUsedProvider(provider);
    const me = await syncWithBackend();
    if (!me) {
      throw new Error("Could not load your Skoun account.");
    }
    onSuccess?.(me.id);
    handleClose();
  };

  const handleOAuthComplete = async (provider: AuthProvider) => {
    await finishAuth(provider);
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
        await clerk.setActive({ session: result.createdSessionId });
        await finishAuth("email");
      } else {
        setError("Sign-in could not be completed. Try again.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not sign in."));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (loading || !clerk.loaded || !clerk.client?.signUp) return;
    if (!validateEmailPassword()) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst) {
      setFieldErrors({ firstName: "First name is required." });
      return;
    }
    if (!trimmedLast) {
      setFieldErrors({ lastName: "Last name is required." });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await clerk.client.signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      await clerk.client.signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setSignUpStep("verify");
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not create account."));
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
      if (result.status === "complete" && result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        await finishAuth("email");
      } else {
        setError("Verification could not be completed. Try again.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Incorrect verification code."));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const modalTitle =
    authMode === "signUp"
      ? signUpStep === "verify"
        ? "Verify your email"
        : "Create your account"
      : title;

  const modalSubtitle =
    authMode === "signUp"
      ? signUpStep === "verify"
        ? `Enter the code sent to ${email.trim().toLowerCase()}`
        : "Sign up with email or continue with a social account"
      : "Welcome back! Sign in to continue";

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
                {signUpStep === "form" ? (
                  <ClerkOAuthSection
                    loading={loading}
                    lastUsedProvider={lastUsedProvider}
                    setLoading={setLoading}
                    setError={setError}
                    onOAuthComplete={handleOAuthComplete}
                  />
                ) : null}

                {authMode === "signUp" && signUpStep === "form" ? (
                  <>
                    <View style={styles.nameRow}>
                      <View style={[styles.inputGroup, styles.nameField]}>
                        <Text style={styles.inputLabel}>First name</Text>
                        <TextInput
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="First name"
                          placeholderTextColor="#A1A1AA"
                          autoCapitalize="words"
                          style={[
                            styles.input,
                            fieldErrors.firstName ? styles.inputError : null,
                          ]}
                        />
                        {fieldErrors.firstName ? (
                          <Text style={styles.fieldErrorText}>
                            {fieldErrors.firstName}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.inputGroup, styles.nameField]}>
                        <Text style={styles.inputLabel}>Last name</Text>
                        <TextInput
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Last name"
                          placeholderTextColor="#A1A1AA"
                          autoCapitalize="words"
                          style={[
                            styles.input,
                            fieldErrors.lastName ? styles.inputError : null,
                          ]}
                        />
                        {fieldErrors.lastName ? (
                          <Text style={styles.fieldErrorText}>
                            {fieldErrors.lastName}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </>
                ) : null}

                {signUpStep === "verify" ? (
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
                ) : (
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
                        textContentType="oneTimeCode"
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
                  </>
                )}

                {lastUsedProvider === "email" && signUpStep === "form" ? (
                  <Text style={styles.lastUsedHint}>
                    Email was last used on this device
                  </Text>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  onPress={() => {
                    if (signUpStep === "verify") {
                      void handleVerifySignUp();
                      return;
                    }
                    if (authMode === "signUp") {
                      void handleEmailSignUp();
                      return;
                    }
                    void handleEmailSignIn();
                  }}
                  disabled={
                    loading ||
                    (signUpStep === "form" && !email.trim()) ||
                    (signUpStep === "form" && !password) ||
                    (signUpStep === "verify" && verificationCode.length < 6)
                  }
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (loading ||
                      (signUpStep === "form" && (!email.trim() || !password)) ||
                      (signUpStep === "verify" &&
                        verificationCode.length < 6)) &&
                      styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Text style={styles.primaryBtnText}>
                        {signUpStep === "verify"
                          ? "Verify email"
                          : authMode === "signUp"
                            ? "Create account"
                            : "Sign in"}
                      </Text>
                      <Text style={styles.btnChevron}>▸</Text>
                    </View>
                  )}
                </Pressable>

                {signUpStep === "verify" ? (
                  <Pressable
                    onPress={() => {
                      setSignUpStep("form");
                      setVerificationCode("");
                      setError(null);
                    }}
                    style={styles.backLinkWrap}
                  >
                    <Text style={styles.backLink}>Back to sign up</Text>
                  </Pressable>
                ) : null}
              </View>
          </ScrollView>

          {signUpStep === "form" ? (
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
                    setVerificationCode("");
                    setSignUpStep("form");
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
