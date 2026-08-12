import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
import { setSession } from "@/lib/session";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (userId: string) => void;
  title?: string;
};

export function SkounAuthModal({ visible, onClose, onSuccess, title = "Sign in to Skoun" }: Props) {
  const clerk = useClerk();

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: "oauth_facebook" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishSuccess = async (userId: string) => {
    await setSession({ userId, role: "renter" });
    if (onSuccess) {
      onSuccess(userId);
    }
    handleClose();
  };

  if (!visible) return null;

  const handleClose = () => {
    setError(null);
    setLoading(false);
    setStep("input");
    setCode("");
    onClose();
  };

  const handleClearStaleSession = async (): Promise<void> => {
    try {
      if (clerk?.signOut) {
        await clerk.signOut();
      }
    } catch {}
  };

  const handleContinueEmail = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (clerk?.client?.signIn) {
        try {
          const signInAttempt = await clerk.client.signIn.create({
            identifier: email.trim(),
          });

          const firstFactor = signInAttempt.supportedFirstFactors?.find(
            (factor: any) => factor.strategy === "email_code"
          );
          if (firstFactor) {
            await clerk.client.signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: (firstFactor as any).emailAddressId,
            });
          }
          setAuthMode("signIn");
          setStep("otp");
          setLoading(false);
          return;
        } catch (signInErr: any) {
          const isAlreadySignedIn =
            signInErr?.errors?.[0]?.code === "session_exists" ||
            signInErr?.message?.toLowerCase().includes("already signed in") ||
            signInErr?.message?.toLowerCase().includes("session already exists") ||
            signInErr?.errors?.[0]?.message?.toLowerCase().includes("already signed in");

          if (isAlreadySignedIn) {
            if (clerk?.user?.id || clerk?.session?.id) {
              await finishSuccess(clerk?.user?.id || clerk?.session?.id || "clerk_user");
              return;
            }
            await handleClearStaleSession();
            const retryAttempt = await clerk.client.signIn.create({
              identifier: email.trim(),
            });
            const firstFactor = retryAttempt.supportedFirstFactors?.find(
              (factor: any) => factor.strategy === "email_code"
            );
            if (firstFactor) {
              await clerk.client.signIn.prepareFirstFactor({
                strategy: "email_code",
                emailAddressId: (firstFactor as any).emailAddressId,
              });
            }
            setAuthMode("signIn");
            setStep("otp");
            setLoading(false);
            return;
          }

          if (signInErr?.errors?.[0]?.code === "form_identifier_not_found" || signInErr?.status === 422) {
            if (clerk?.client?.signUp) {
              await clerk.client.signUp.create({
                emailAddress: email.trim(),
              });
              await clerk.client.signUp.prepareEmailAddressVerification({
                strategy: "email_code",
              });
              setAuthMode("signUp");
              setStep("otp");
              setLoading(false);
              return;
            }
          } else {
            throw signInErr;
          }
        }
      }

      setStep("otp");
    } catch (err: any) {
      const isAlreadySignedIn =
        err?.errors?.[0]?.code === "session_exists" ||
        err?.message?.toLowerCase().includes("already signed in") ||
        err?.message?.toLowerCase().includes("session already exists");

      if (isAlreadySignedIn && (clerk?.user?.id || clerk?.session?.id)) {
        await finishSuccess(clerk?.user?.id || clerk?.session?.id || "clerk_user");
        return;
      }

      const msg =
        err?.errors?.[0]?.message || err?.message || "Could not continue with email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      let createdSessionId: string | null = null;

      if (authMode === "signIn" && clerk?.client?.signIn) {
        const res = await clerk.client.signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });
        if (res.status === "complete" && res.createdSessionId) {
          createdSessionId = res.createdSessionId;
          await clerk.setActive({ session: res.createdSessionId });
        }
      } else if (authMode === "signUp" && clerk?.client?.signUp) {
        const res = await clerk.client.signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (res.status === "complete" && res.createdSessionId) {
          createdSessionId = res.createdSessionId;
          await clerk.setActive({ session: res.createdSessionId });
        }
      }

      if (createdSessionId) {
        await finishSuccess(createdSessionId);
      } else {
        setError("Verification code could not be completed.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message || err?.message || "Invalid verification code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoading(true);
    setError(null);

    try {
      const strategy = `oauth_${provider}` as const;

      // On Web: redirect in the SAME TAB instead of opening a popup window
      if (Platform.OS === "web" && clerk?.client?.signIn) {
        try {
          const redirectUrl = typeof window !== "undefined" ? window.location.origin : "/";
          await clerk.client.signIn.authenticateWithRedirect({
            strategy,
            redirectUrl,
            redirectUrlComplete: redirectUrl,
          });
          return;
        } catch (redirectErr: any) {
          const isAlreadySignedIn =
            redirectErr?.errors?.[0]?.code === "session_exists" ||
            redirectErr?.message?.toLowerCase().includes("already signed in") ||
            redirectErr?.message?.toLowerCase().includes("session already exists") ||
            redirectErr?.errors?.[0]?.message?.toLowerCase().includes("already signed in");

          if (isAlreadySignedIn) {
            await handleClearStaleSession();
            const redirectUrl = typeof window !== "undefined" ? window.location.origin : "/";
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

      // Native platform flow (iOS / Android)
      let startFlow = startGoogleOAuth;
      if (provider === "facebook") startFlow = startFacebookOAuth;
      if (provider === "apple") startFlow = startAppleOAuth;

      const res = await startFlow();
      if (res?.createdSessionId && res?.setActive) {
        await res.setActive({ session: res.createdSessionId });
        await finishSuccess(res.createdSessionId);
        return;
      }

      if (clerk?.user?.id) {
        await finishSuccess(clerk.user.id);
        return;
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      const isAlreadySignedIn =
        err?.errors?.[0]?.code === "session_exists" ||
        err?.message?.toLowerCase().includes("already signed in") ||
        err?.message?.toLowerCase().includes("session already exists") ||
        err?.errors?.[0]?.message?.toLowerCase().includes("already signed in");

      if (isAlreadySignedIn && (clerk?.user?.id || clerk?.session?.id)) {
        await finishSuccess(clerk?.user?.id || clerk?.session?.id || "clerk_user");
        return;
      }

      const msg =
        err?.errors?.[0]?.message ||
        err?.message ||
        `${provider} authentication failed. Please try again.`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Close button at top right */}
          <Pressable
            onPress={handleClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </Pressable>

          <View style={styles.contentPadding}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                Welcome back! Please sign in to continue
              </Text>
            </View>

            {/* Body Step 1: Input form */}
            {step === "input" ? (
              <View style={styles.body}>
                {/* Social Buttons */}
                <View style={styles.socialCol}>
                  {/* Google Button with 'Last used' badge */}
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
                    <View style={styles.lastUsedBadge}>
                      <Text style={styles.lastUsedText}>Last used</Text>
                    </View>
                  </View>

                  {/* Apple Button */}
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

                  {/* Facebook Button */}
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
                </View>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email Section */}
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
                    style={styles.input}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Primary Continue Button (Dark Black with chevron) */}
                <Pressable
                  onPress={handleContinueEmail}
                  disabled={!email.trim() || loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!email.trim() || loading) && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Text style={styles.primaryBtnText}>Continue</Text>
                      <Text style={styles.btnChevron}>▸</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            ) : (
              /* Step 2: Verification Code Entry */
              <View style={styles.body}>
                <Text style={styles.otpSub}>
                  We sent a verification code to{" "}
                  <Text style={styles.otpEmail}>{email}</Text>
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification code</Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={!code.trim() || loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!code.trim() || loading) && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify Code</Text>
                  )}
                </Pressable>

                <Pressable onPress={() => setStep("input")} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>Change email address</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Footer Card Section */}
          <View style={styles.footerCard}>
            <Text style={styles.footerText}>
              Don’t have an account?{" "}
              <Text
                style={styles.signUpLink}
                onPress={() => {
                  setAuthMode("signUp");
                  setStep("input");
                }}
              >
                Sign up
              </Text>
            </Text>
          </View>
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
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#09090B",
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
  otpSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    marginBottom: 4,
  },
  otpEmail: {
    fontFamily: Skoun.type.bodyBold,
    color: "#09090B",
  },
  backBtn: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  backBtnText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: "#18181B",
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
