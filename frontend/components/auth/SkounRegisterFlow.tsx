import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  completeRegistration,
  requestRegistrationCode,
  verifyRegistrationCode,
  RegistrationApiError,
} from "@/features/auth/registrationApi";
import {
  evaluatePasswordStrength,
  PASSWORD_MIN_LENGTH,
  type PasswordStrength,
} from "@/lib/passwordStrength";
import { setLastAuthProvider } from "@/lib/session";

type Step = "email" | "otp" | "name" | "dob" | "password" | "success";

const STEPS: Step[] = ["email", "otp", "name", "dob", "password", "success"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onBackToSignIn: () => void;
  onSuccess?: (userId: string) => void;
  onClose: () => void;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function isFutureDate(value: string): boolean {
  const today = formatDateKey(new Date());
  return value > today;
}

export function SkounRegisterFlow({
  onBackToSignIn,
  onSuccess,
  onClose,
}: Props) {
  const { establishSession } = useAuthSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [completionToken, setCompletionToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [strength, setStrength] = useState<PasswordStrength>(() =>
    evaluatePasswordStrength(""),
  );
  const inFlight = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  useEffect(() => {
    setStrength(
      evaluatePasswordStrength(password, [
        email,
        firstName,
        lastName,
      ]),
    );
  }, [password, email, firstName, lastName]);

  const stepIndex = STEPS.indexOf(step);
  const progressSteps = STEPS.filter((s) => s !== "success");

  const setBusy = async (fn: () => Promise<void>) => {
    if (inFlight.current || loading) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      await fn();
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleRequestCode = async (isResend = false) => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setFieldErrors({ email: "Email is required." });
      return;
    }
    if (!EMAIL_RE.test(normalized)) {
      setFieldErrors({ email: "Enter a valid email address." });
      return;
    }
    setFieldErrors({});
    setEmail(normalized);

    await setBusy(async () => {
      try {
        const res = await requestRegistrationCode(normalized);
        setResendCooldown(res.resendCooldownSeconds);
        setDeliveryWarning(res.deliveryWarning ?? null);
        setStep("otp");
        if (!isResend) setCode("");
      } catch (err) {
        if (err instanceof RegistrationApiError) {
          if (err.code === "CONFLICT" || err.status === 409) {
            // Field error only — avoid duplicate red messages under input + above button.
            setError(null);
            setFieldErrors({ email: err.message });
            return;
          }
          setFieldErrors({});
          setError(err.message);
          return;
        }
        setError("Could not send verification code.");
      }
    });
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setFieldErrors({ code: "Enter the 6-digit verification code." });
      return;
    }
    setFieldErrors({});

    await setBusy(async () => {
      try {
        const res = await verifyRegistrationCode(normalizeEmail(email), trimmed);
        setCompletionToken(res.completionToken);
        setStep("name");
      } catch (err) {
        if (err instanceof RegistrationApiError) {
          setError(err.message);
          return;
        }
        setError("Could not verify code.");
      }
    });
  };

  const handleNameNext = () => {
    const first = firstName.trim().replace(/\s+/g, " ");
    const last = lastName.trim().replace(/\s+/g, " ");
    const next: Record<string, string> = {};
    if (!first) next.firstName = "First name is required.";
    if (!last) next.lastName = "Last name is required.";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setFirstName(first);
    setLastName(last);
    setError(null);
    setStep("dob");
  };

  const handleDobNext = () => {
    if (!dateOfBirth) {
      setFieldErrors({ dateOfBirth: "Date of birth is required." });
      return;
    }
    if (!parseDateKey(dateOfBirth)) {
      setFieldErrors({ dateOfBirth: "Enter a valid date." });
      return;
    }
    if (isFutureDate(dateOfBirth)) {
      setFieldErrors({ dateOfBirth: "Date of birth cannot be in the future." });
      return;
    }
    setFieldErrors({});
    setError(null);
    setStep("password");
  };

  const handleCreateAccount = async () => {
    if (!completionToken) {
      setError("Email verification required. Request a new code.");
      setStep("email");
      return;
    }
    const next: Record<string, string> = {};
    if (!strength.isStrong) {
      next.password = "Password must meet the strong password requirements.";
    }
    if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    await setBusy(async () => {
      try {
        const user = await completeRegistration({
          completionToken,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth,
          password,
          confirmPassword,
        });
        await setLastAuthProvider("email");
        await establishSession({ userId: user.id, role: user.role });
        setStep("success");
        setTimeout(() => {
          onSuccess?.(user.id);
          onClose();
        }, 1400);
      } catch (err) {
        if (err instanceof RegistrationApiError) {
          if (err.code === "EMAIL_NOT_VERIFIED") {
            setCompletionToken(null);
            setStep("email");
          }
          setError(err.message);
          return;
        }
        setError("Could not create account.");
      }
    });
  };

  const onNativeDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") {
      setShowNativePicker(false);
    }
    if (event.type === "dismissed" || !date) return;
    setDateOfBirth(formatDateKey(date));
    if (fieldErrors.dateOfBirth) {
      setFieldErrors((prev) => {
        const { dateOfBirth: _d, ...rest } = prev;
        return rest;
      });
    }
  };

  const renderProgress = () => {
    if (step === "success") return null;
    return (
      <View style={styles.progressRow}>
        {progressSteps.map((s, idx) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              idx <= progressSteps.indexOf(step) && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    visible: boolean,
    toggle: () => void,
    errorKey: string,
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.passwordLabelRow}>
        <Text style={styles.inputLabel}>
          {label} <Text style={styles.requiredMark}>*</Text>
        </Text>
        <Pressable onPress={toggle} hitSlop={8}>
          <Text style={styles.showHideText}>{visible ? "HIDE" : "SHOW"}</Text>
        </Pressable>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={
          errorKey === "password"
            ? `At least ${PASSWORD_MIN_LENGTH} characters`
            : "Re-enter your password"
        }
        placeholderTextColor="#A1A1AA"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="oneTimeCode"
        style={[styles.input, fieldErrors[errorKey] ? styles.inputError : null]}
      />
      {fieldErrors[errorKey] ? (
        <Text style={styles.fieldErrorText}>{fieldErrors[errorKey]}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === "success" ? "Account created" : "Create your Skoun account"}
        </Text>
        {step !== "success" ? (
          <Text style={styles.subtitle}>
            {step === "email" && "Enter your email to get started"}
            {step === "otp" && "Verify the code we sent you"}
            {step === "name" && "What is your legal name?"}
            {step === "dob" && "When is your date of birth?"}
            {step === "password" && "Create a strong password"}
          </Text>
        ) : null}
        {renderProgress()}
      </View>

      {step === "email" ? (
        <View style={styles.body}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Email address <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => {
                    const { email: _e, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="Enter your email address"
              placeholderTextColor="#A1A1AA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, fieldErrors.email ? styles.inputError : null]}
            />
            {fieldErrors.email ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            onPress={() => handleRequestCode(false)}
            disabled={loading || !email.trim()}
            style={({ pressed }) => [
              styles.primaryBtn,
              (loading || !email.trim()) && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
          {(
            error?.toLowerCase().includes("already exists") ||
            fieldErrors.email?.toLowerCase().includes("already exists")
          ) ? (
            <Pressable onPress={onBackToSignIn} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back to sign in</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {step === "otp" ? (
        <View style={styles.body}>
          <Text style={styles.otpSub}>
            We sent a verification code to{" "}
            <Text style={styles.otpEmail}>{email}</Text>
          </Text>
          {deliveryWarning ? (
            <Text style={styles.deliveryWarning}>{deliveryWarning}</Text>
          ) : null}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Verification code <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#A1A1AA"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, fieldErrors.code ? styles.inputError : null]}
            />
            {fieldErrors.code ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.code}</Text>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            onPress={handleVerifyCode}
            disabled={loading || code.trim().length < 6}
            style={({ pressed }) => [
              styles.primaryBtn,
              (loading || code.trim().length < 6) && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify email</Text>
            )}
          </Pressable>
          <Pressable
            disabled={loading || resendCooldown > 0}
            onPress={() => handleRequestCode(true)}
            style={styles.backBtn}
          >
            <Text
              style={[
                styles.backBtnText,
                resendCooldown > 0 && styles.backBtnMuted,
              ]}
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Change email</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "name" ? (
        <View style={styles.body}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              First name <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Legal first name"
              placeholderTextColor="#A1A1AA"
              autoCapitalize="words"
              style={[
                styles.input,
                fieldErrors.firstName ? styles.inputError : null,
              ]}
            />
            {fieldErrors.firstName ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.firstName}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Last name <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Legal last name"
              placeholderTextColor="#A1A1AA"
              autoCapitalize="words"
              style={[
                styles.input,
                fieldErrors.lastName ? styles.inputError : null,
              ]}
            />
            {fieldErrors.lastName ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.lastName}</Text>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            onPress={handleNameNext}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
          <Pressable onPress={() => setStep("otp")} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "dob" ? (
        <View style={styles.body}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Date of birth <Text style={styles.requiredMark}>*</Text>
            </Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={dateOfBirth}
                max={formatDateKey(new Date())}
                onChange={(e: { target: { value: string } }) => {
                  setDateOfBirth(e.target.value);
                  if (fieldErrors.dateOfBirth) {
                    setFieldErrors((prev) => {
                      const { dateOfBirth: _d, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                style={{
                  fontFamily: Skoun.type.body,
                  fontSize: 14,
                  color: "#09090B",
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: fieldErrors.dateOfBirth ? "#B42318" : "#E4E4E7",
                  borderStyle: "solid",
                  paddingLeft: 14,
                  paddingRight: 14,
                  backgroundColor: "#FFFFFF",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <>
                <Pressable
                  onPress={() => setShowNativePicker(true)}
                  style={[
                    styles.input,
                    styles.datePressable,
                    fieldErrors.dateOfBirth ? styles.inputError : null,
                  ]}
                >
                  <Text
                    style={
                      dateOfBirth ? styles.dateValue : styles.datePlaceholder
                    }
                  >
                    {dateOfBirth || "Select date of birth"}
                  </Text>
                </Pressable>
                {showNativePicker ? (
                  <DateTimePicker
                    value={parseDateKey(dateOfBirth) ?? new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={onNativeDateChange}
                  />
                ) : null}
              </>
            )}
            {fieldErrors.dateOfBirth ? (
              <Text style={styles.fieldErrorText}>
                {fieldErrors.dateOfBirth}
              </Text>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            onPress={handleDobNext}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
          <Pressable onPress={() => setStep("name")} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "password" ? (
        <View style={styles.body}>
          {renderPasswordField(
            "Password",
            password,
            setPassword,
            showPassword,
            () => setShowPassword((v) => !v),
            "password",
          )}

          <View style={styles.strengthBlock}>
            <View style={styles.strengthBars}>
              {[0, 1, 2].map((i) => {
                const active =
                  strength.label === "Strong"
                    ? true
                    : strength.label === "Medium"
                      ? i < 2
                      : i < 1 && password.length > 0;
                const color =
                  strength.label === "Strong"
                    ? "#16A34A"
                    : strength.label === "Medium"
                      ? "#CA8A04"
                      : "#DC2626";
                return (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      active && { backgroundColor: color },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.strengthLabel}>
              {password ? strength.label : "Password strength"}
            </Text>
          </View>

          <View style={styles.reqList}>
            <Text style={styles.reqTitle}>Password requirements:</Text>
            {(
              [
                ["minLength", `At least ${PASSWORD_MIN_LENGTH} characters`],
                ["uppercase", "Uppercase letter"],
                ["lowercase", "Lowercase letter"],
                ["number", "Number"],
                ["special", "Special character"],
              ] as const
            ).map(([key, label]) => (
              <Text
                key={key}
                style={[
                  styles.reqItem,
                  strength.checks[key] && styles.reqItemMet,
                ]}
              >
                {strength.checks[key] ? "✓" : "○"} {label}
              </Text>
            ))}
            <Text
              style={[
                styles.reqItem,
                strength.isStrong && styles.reqItemMet,
              ]}
            >
              {strength.isStrong ? "✓" : "○"} Not easily guessable
            </Text>
          </View>

          {renderPasswordField(
            "Confirm password",
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            () => setShowConfirmPassword((v) => !v),
            "confirmPassword",
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleCreateAccount}
            disabled={
              loading ||
              !strength.isStrong ||
              !confirmPassword ||
              password !== confirmPassword
            }
            style={({ pressed }) => [
              styles.primaryBtn,
              (loading ||
                !strength.isStrong ||
                !confirmPassword ||
                password !== confirmPassword) &&
                styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Create account</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setStep("dob")} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "success" ? (
        <View style={styles.successBody}>
          <Text style={styles.successTitle}>You are signed in</Text>
          <Text style={styles.successSub}>Taking you back to Skoun…</Text>
        </View>
      ) : null}

      {step !== "success" ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Text style={styles.link} onPress={onBackToSignIn}>
              Sign in
            </Text>
          </Text>
          {stepIndex > 0 ? (
            <Text style={styles.stepHint}>
              Step {progressSteps.indexOf(step) + 1} of {progressSteps.length}
            </Text>
          ) : null}
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxHeight: "100%",
  },
  scrollContent: {
    paddingBottom: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
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
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E4E4E7",
  },
  progressDotActive: {
    backgroundColor: "#18181B",
  },
  body: {
    gap: 14,
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#09090B",
  },
  requiredMark: {
    color: Skoun.color.danger,
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
  },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#18181B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.88,
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
  backBtnMuted: {
    color: "#A1A1AA",
    textDecorationLine: "none",
  },
  otpSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
  },
  otpEmail: {
    fontFamily: Skoun.type.bodyBold,
    color: "#09090B",
  },
  deliveryWarning: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#B45309",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
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
  strengthBlock: {
    gap: 6,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E4E4E7",
  },
  strengthLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: "#71717A",
  },
  reqList: {
    gap: 4,
  },
  reqTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: "#09090B",
    marginBottom: 2,
  },
  reqItem: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#A1A1AA",
  },
  reqItemMet: {
    color: "#16A34A",
  },
  datePressable: {
    justifyContent: "center",
  },
  dateValue: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#09090B",
  },
  datePlaceholder: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#A1A1AA",
  },
  successBody: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  successTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: "#09090B",
  },
  successSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#71717A",
  },
  footer: {
    marginTop: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderColor: "#F4F4F5",
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#71717A",
  },
  link: {
    fontFamily: Skoun.type.bodySemi,
    color: "#09090B",
    textDecorationLine: "underline",
  },
  stepHint: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#A1A1AA",
  },
});
