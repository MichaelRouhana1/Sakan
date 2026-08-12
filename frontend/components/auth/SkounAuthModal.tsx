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
import { ensureSessionForRole } from "@/features/auth/useEnsureSession";
import { getSession, setSession } from "@/lib/session";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
};

export function SkounAuthModal({ visible, onClose, title = "Login to Amber" }: Props) {
  const clerk = useClerk();

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: "oauth_facebook" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "phone" | "otp">("input");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      getSession().then((session) => {
        if (session) {
          onClose();
        }
      });
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const handleClose = () => {
    setError(null);
    setLoading(false);
    setStep("input");
    setCode("");
    onClose();
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
          const errCode = signInErr?.errors?.[0]?.code;
          if (errCode === "form_identifier_not_found" || signInErr?.status === 422) {
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

      if (!createdSessionId) {
        const mockUser = await ensureSessionForRole("renter");
        createdSessionId = mockUser.id;
      } else {
        await setSession({ userId: createdSessionId, role: "renter" });
      }

      handleClose();
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message || err?.message || "Invalid verification code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleContinuePhone = async () => {
    if (!phone.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (clerk?.client?.signIn) {
        try {
          const res = await clerk.client.signIn.create({
            identifier: phone.trim(),
          });
          const phoneFactor = res.supportedFirstFactors?.find(
            (f: any) => f.strategy === "phone_code"
          );
          if (phoneFactor) {
            await clerk.client.signIn.prepareFirstFactor({
              strategy: "phone_code",
              phoneNumberId: (phoneFactor as any).phoneNumberId,
            });
          }
          setAuthMode("signIn");
          setStep("otp");
          setLoading(false);
          return;
        } catch {
          if (clerk?.client?.signUp) {
            await clerk.client.signUp.create({ phoneNumber: phone.trim() });
            await clerk.client.signUp.preparePhoneNumberVerification();
            setAuthMode("signUp");
            setStep("otp");
            setLoading(false);
            return;
          }
        }
      }
      setStep("otp");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Phone verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoading(true);
    setError(null);

    try {
      let flow;
      if (provider === "google") flow = startGoogleOAuth;
      else if (provider === "facebook") flow = startFacebookOAuth;
      else if (provider === "apple") flow = startAppleOAuth;

      if (flow) {
        const { createdSessionId, setActive } = await flow();
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          await setSession({ userId: createdSessionId, role: "renter" });
          handleClose();
          return;
        }
      }

      const localUser = await ensureSessionForRole("renter");
      await setSession({ userId: localUser.id, role: "renter" });
      handleClose();
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message ||
        err?.message ||
        `${provider} authentication failed.`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleUserEmail =
    clerk?.user?.primaryEmailAddress?.emailAddress || "rouhana_michael@live.com";

  const googleUserName =
    clerk?.user?.fullName || clerk?.user?.firstName || "Michael";

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
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </Pressable>
          </View>

          {/* Body Step 1: Input form (Email or Phone) */}
          {step === "input" ? (
            <View style={styles.body}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Continue Button (Pink Accent matching user screenshot) */}
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
                  <Text style={styles.primaryBtnText}>Continue</Text>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or log in using</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Alt Login options */}
              <View style={styles.socialCol}>
                {/* Phone Option */}
                <Pressable
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    pressed && styles.pressed,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={() => setStep("phone")}
                >
                  <Ionicons name="call" size={18} color="#0F172A" style={styles.iconOffset} />
                  <Text style={styles.socialBtnText}>Continue with Phone</Text>
                </Pressable>

                {/* Google Option - Styled like user screenshot with quick sign-in card */}
                <Pressable
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.googleCardBtn,
                    pressed && styles.pressed,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={() => handleOAuth("google")}
                >
                  <View style={styles.googleAvatarCircle}>
                    <Text style={styles.googleAvatarLetter}>
                      {googleUserName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.googleAccountCol}>
                    <Text style={styles.googleSignTitle}>Sign in as {googleUserName}</Text>
                    <Text style={styles.googleEmailText} numberOfLines={1}>
                      {googleUserEmail}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginRight: 6 }} />
                  {/* Google Icon */}
                  <View style={styles.googleGLogo}>
                    <Ionicons name="logo-google" size={16} color="#EA4335" />
                  </View>
                </Pressable>

                {/* Facebook Option */}
                <Pressable
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    pressed && styles.pressed,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={() => handleOAuth("facebook")}
                >
                  <Ionicons name="logo-facebook" size={18} color="#1877F2" style={styles.iconOffset} />
                  <Text style={styles.socialBtnText}>Continue with Facebook</Text>
                </Pressable>

                {/* Apple Option */}
                <Pressable
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    pressed && styles.pressed,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={() => handleOAuth("apple")}
                >
                  <Ionicons name="logo-apple" size={18} color="#000000" style={styles.iconOffset} />
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                </Pressable>
              </View>

              {/* Disclaimer */}
              <Text style={styles.disclaimerText}>
                By signing in you agree to our{" "}
                <Text style={styles.disclaimerLink}>Privacy Policy</Text> and{" "}
                <Text style={styles.disclaimerLink}>Terms & Conditions</Text>
              </Text>
            </View>
          ) : step === "phone" ? (
            /* Step: Phone Number Entry */
            <View style={styles.body}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number (e.g. +96170123456)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                onPress={handleContinuePhone}
                disabled={!phone.trim() || loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!phone.trim() || loading) && styles.btnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Code</Text>
                )}
              </Pressable>

              <Pressable onPress={() => setStep("input")} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back to Email Sign In</Text>
              </Pressable>
            </View>
          ) : (
            /* Step 2: Verification OTP Code Entry */
            <View style={styles.body}>
              <Text style={styles.otpSub}>
                We sent a verification code to{" "}
                <Text style={styles.otpEmail}>{email || phone}</Text>
              </Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Verification Code"
                  placeholderTextColor="#94A3B8"
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
                <Text style={styles.backBtnText}>Change Email / Phone</Text>
              </Pressable>
            </View>
          )}
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
    maxWidth: 410,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 19,
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    gap: 14,
  },
  inputWrap: {
    width: "100%",
  },
  input: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#0F172A",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.danger,
    marginTop: -4,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FF7E93", // Soft pink matching Amber screenshot
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.88,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: "#94A3B8",
    paddingHorizontal: 12,
  },
  socialCol: {
    gap: 10,
  },
  socialBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  iconOffset: {
    position: "absolute",
    left: 16,
  },
  socialBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#1E293B",
  },

  // GOOGLE CARD BUTTON (Matching screenshot)
  googleCardBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  googleAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EA4335",
    alignItems: "center",
    justifyContent: "center",
  },
  googleAvatarLetter: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  googleAccountCol: {
    flex: 1,
    justifyContent: "center",
  },
  googleSignTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: "#0F172A",
    lineHeight: 15,
  },
  googleEmailText: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 14,
  },
  googleGLogo: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  disclaimerText: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 6,
  },
  disclaimerLink: {
    color: "#FF5E7E",
    fontFamily: Skoun.type.bodySemi,
  },
  otpSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  otpEmail: {
    fontFamily: Skoun.type.bodyBold,
    color: "#0F172A",
  },
  backBtn: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  backBtnText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: "#FF5E7E",
  },
});
