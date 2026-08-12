import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp, useUser, useOAuth } from "@clerk/expo";
import { Skoun } from "@/constants/theme";

// Warm up WebBrowser on native/web to prevent popup delays
WebBrowser.maybeCompleteAuthSession();

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SkounAuthModal({ visible, onClose }: Props) {
  const { isSignedIn } = useUser();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  const googleOAuth = useOAuth({ strategy: "oauth_google" });
  const appleOAuth = useOAuth({ strategy: "oauth_apple" });
  const facebookOAuth = useOAuth({ strategy: "oauth_facebook" });

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-close modal if user becomes signed in
  useEffect(() => {
    if (isSignedIn && visible) {
      setLoading(false);
      onClose();
    }
  }, [isSignedIn, visible, onClose]);

  if (!visible) return null;

  const handleClose = () => {
    setError(null);
    setLoading(false);
    setStep("input");
    onClose();
  };

  const handleContinueEmail = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (!isSignInLoaded || !signIn) {
        setLoading(false);
        return;
      }

      // First attempt sign-in with email_code
      try {
        const attempt = await signIn.create({
          identifier: email.trim(),
        });
        const firstFactor = attempt.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code"
        );
        if (firstFactor && "emailAddressId" in firstFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: firstFactor.emailAddressId,
          });
          setStep("otp");
        } else {
          setStep("otp");
        }
      } catch (err: any) {
        // If user not found, attempt sign up
        if (
          err?.errors?.[0]?.code === "form_identifier_not_found" &&
          isSignUpLoaded &&
          signUp
        ) {
          const signUpAttempt = await signUp.create({
            emailAddress: email.trim(),
          });
          await signUpAttempt.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setStep("otp");
        } else {
          setError(
            err?.errors?.[0]?.message || "Something went wrong. Please check your email."
          );
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Error sending code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (signIn && signIn.status === "needs_first_factor") {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });
        if (result.status === "complete" && result.createdSessionId) {
          if (setActive) {
            await setActive({ session: result.createdSessionId });
          }
          handleClose();
          return;
        }
      }

      if (signUp && signUp.status === "missing_requirements") {
        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (result.status === "complete" && result.createdSessionId) {
          if (setActive) {
            await setActive({ session: result.createdSessionId });
          }
          handleClose();
          return;
        }
      }

      setError("Verification code incomplete. Please try again.");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook") => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS === "web") {
        if (!isSignInLoaded || !signIn) {
          console.error("Clerk SignIn not loaded");
          setLoading(false);
          return;
        }

        // Main window direct redirect to Google (bypasses popups and COOP blocks)
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        const oauth =
          strategy === "oauth_google"
            ? googleOAuth
            : strategy === "oauth_apple"
            ? appleOAuth
            : facebookOAuth;

        const redirectUrl = AuthSession.makeRedirectUri({
          scheme: "skoun",
          path: "sso-callback",
        });

        const { createdSessionId, setActive: setOAuthActive, signUp: oauthSignUp } =
          await oauth.startOAuthFlow({ redirectUrl });

        if (createdSessionId) {
          if (setOAuthActive) {
            await setOAuthActive({ session: createdSessionId });
          } else if (setActive) {
            await setActive({ session: createdSessionId });
          }
          handleClose();
        } else if (oauthSignUp && (oauthSignUp as any).status === "missing_requirements") {
          // Handle new user account creation on native
          const res = await (oauthSignUp as any).create({ transfer: true });
          if (res.status === "complete" && res.createdSessionId) {
            if (setOAuthActive) {
              await setOAuthActive({ session: res.createdSessionId });
            } else if (setActive) {
              await setActive({ session: res.createdSessionId });
            }
            handleClose();
          }
        }
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Google OAuth Error:", err);
      setError(err?.errors?.[0]?.message || "OAuth sign in could not be completed.");
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
        <View id="clerk-captcha" />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Login to Skoun</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Body Step 1: Email Input */}
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

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or log in using</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Alt Login options */}
              <View style={styles.socialCol}>
                <Pressable
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                  onPress={() => setError("Phone authentication: please enter your email above.")}
                >
                  <Ionicons name="call" size={18} color="#0F172A" />
                  <Text style={styles.socialBtnText}>Continue with Phone</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                  onPress={() => handleOAuth("oauth_google")}
                >
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.socialBtnText}>Continue with Google</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                  onPress={() => handleOAuth("oauth_facebook")}
                >
                  <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                  <Text style={styles.socialBtnText}>Continue with Facebook</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                  onPress={() => handleOAuth("oauth_apple")}
                >
                  <Ionicons name="logo-apple" size={18} color="#000000" />
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                </Pressable>
              </View>

              <Text style={styles.disclaimerText}>
                By signing in you agree to our{" "}
                <Text style={styles.disclaimerLink}>Privacy Policy</Text> and{" "}
                <Text style={styles.disclaimerLink}>Terms & Conditions</Text>
              </Text>
            </View>
          ) : (
            /* Step 2: Verification Code Input */
            <View style={styles.body}>
              <Text style={styles.otpSub}>
                We sent a 6-digit verification code to{" "}
                <Text style={styles.otpEmail}>{email}</Text>
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
                <Text style={styles.backBtnText}>Change Email</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
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
    fontSize: 20,
    color: "#0F172A",
    letterSpacing: -0.4,
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
    fontSize: 15,
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
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
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
    fontSize: 13,
    color: "#94A3B8",
    paddingHorizontal: 12,
  },
  socialCol: {
    gap: 10,
  },
  socialBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#0F172A",
  },
  disclaimerText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
  },
  disclaimerLink: {
    color: Skoun.color.primary,
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
    fontSize: 14,
    color: Skoun.color.primary,
  },
});
