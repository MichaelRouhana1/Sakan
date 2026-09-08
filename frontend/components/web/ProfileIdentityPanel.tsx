import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { syncIdentityFromClerk } from "@/features/auth/userApi";
import {
  parseLebanonNumber,
  toE164,
  toNationalDisplay,
} from "@/lib/lebanonPhone";
import {
  passwordMeetsPolicy,
  passwordMismatch,
} from "@/lib/passwordStrength";

type PressState = { pressed: boolean; hovered?: boolean };
type Field = "name" | "email" | "phone" | "password";
type VerifyKind = "email" | "phone" | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clerkMessage(err: unknown, fallback: string): string {
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

function toPhoneE164(raw: string): string | null {
  const trimmed = raw.trim();
  const parsed = parseLebanonNumber(trimmed);
  if (parsed) return toE164(parsed);
  const compact = trimmed.replace(/\s/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

function displayPhone(raw: string | null | undefined): string {
  if (!raw) return "Not on file";
  const parsed = parseLebanonNumber(raw);
  return parsed ? toNationalDisplay(parsed) : raw;
}

type Props = {
  stacked: boolean;
};

export function ProfileIdentityPanel({ stacked }: Props) {
  const { user, refreshUser } = useAuthSession();
  const { user: clerkUser } = useUser();

  const firstName =
    clerkUser?.firstName?.trim() || user?.firstName?.trim() || "";
  const lastName = clerkUser?.lastName?.trim() || user?.lastName?.trim() || "";
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress || user?.email || "";
  const phone =
    clerkUser?.primaryPhoneNumber?.phoneNumber || user?.phone || "";
  const passwordEnabled = Boolean(clerkUser?.passwordEnabled);

  const [open, setOpen] = useState<Field | null>(null);
  const [verify, setVerify] = useState<VerifyKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstDraft, setFirstDraft] = useState("");
  const [lastDraft, setLastDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetDrafts = (field: Field | null) => {
    setError(null);
    setVerify(null);
    setCode("");
    setShowPassword(false);
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setFirstDraft(firstName);
    setLastDraft(lastName);
    setEmailDraft(email);
    setPhoneDraft(phone ? displayPhone(phone) : "");
    setOpen(field);
  };

  const persist = async () => {
    await clerkUser?.reload();
    try {
      await syncIdentityFromClerk();
    } catch {
      /* Clerk is already updated; Skoun copy can catch up on next load. */
    }
    await refreshUser();
  };

  const close = () => {
    if (busy) return;
    resetDrafts(null);
  };

  const saveName = async () => {
    if (!clerkUser) return;
    const first = firstDraft.trim();
    const last = lastDraft.trim();
    if (!first) {
      setError("Enter your first name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clerkUser.update({ firstName: first, lastName: last || undefined });
      await persist();
      resetDrafts(null);
    } catch (err) {
      setError(clerkMessage(err, "Could not update your name."));
    } finally {
      setBusy(false);
    }
  };

  const sendEmailCode = async () => {
    if (!clerkUser) return;
    const next = emailDraft.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) {
      setError("Enter a valid email address.");
      return;
    }
    if (next === email.toLowerCase()) {
      setError("That’s already your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = clerkUser.emailAddresses.find(
        (entry) => entry.emailAddress.toLowerCase() === next,
      );
      const target = existing ?? (await clerkUser.createEmailAddress({ email: next }));
      await target.prepareVerification({ strategy: "email_code" });
      setVerify("email");
    } catch (err) {
      setError(clerkMessage(err, "Could not send a verification code."));
    } finally {
      setBusy(false);
    }
  };

  const confirmEmail = async () => {
    if (!clerkUser) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = emailDraft.trim().toLowerCase();
      const target = clerkUser.emailAddresses.find(
        (entry) => entry.emailAddress.toLowerCase() === next,
      );
      if (!target) {
        setError("Start again — that email is no longer on this account.");
        return;
      }
      await target.attemptVerification({ code: trimmed });
      await clerkUser.update({ primaryEmailAddressId: target.id });
      await persist();
      resetDrafts(null);
    } catch (err) {
      setError(clerkMessage(err, "Incorrect code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneCode = async () => {
    if (!clerkUser) return;
    const e164 = toPhoneE164(phoneDraft);
    if (!e164) {
      setError("Enter a Lebanese mobile, like 71 123 456.");
      return;
    }
    if (phone && toPhoneE164(phone) === e164) {
      setError("That’s already your number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = clerkUser.phoneNumbers.find(
        (entry) => entry.phoneNumber === e164,
      );
      const target =
        existing ?? (await clerkUser.createPhoneNumber({ phoneNumber: e164 }));
      await target.prepareVerification({ strategy: "phone_code" });
      setVerify("phone");
    } catch (err) {
      setError(clerkMessage(err, "Could not send a verification code."));
    } finally {
      setBusy(false);
    }
  };

  const confirmPhone = async () => {
    if (!clerkUser) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your SMS.");
      return;
    }
    const e164 = toPhoneE164(phoneDraft);
    setBusy(true);
    setError(null);
    try {
      const target = clerkUser.phoneNumbers.find(
        (entry) => entry.phoneNumber === e164,
      );
      if (!target) {
        setError("Start again — that number is no longer on this account.");
        return;
      }
      await target.attemptVerification({ code: trimmed });
      await clerkUser.update({ primaryPhoneNumberId: target.id });
      await persist();
      resetDrafts(null);
    } catch (err) {
      setError(clerkMessage(err, "Incorrect code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!clerkUser) return;
    if (passwordEnabled && !currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (!passwordMeetsPolicy(nextPassword)) {
      setError("Choose a stronger password — see the checklist.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clerkUser.updatePassword({
        newPassword: nextPassword,
        ...(passwordEnabled ? { currentPassword } : {}),
        signOutOfOtherSessions: true,
      });
      await persist();
      resetDrafts(null);
    } catch (err) {
      setError(clerkMessage(err, "Could not update your password."));
    } finally {
      setBusy(false);
    }
  };

  const title =
    open === "name"
      ? "Your name"
      : open === "email"
        ? verify === "email"
          ? "Check your email"
          : "Your email"
        : open === "phone"
          ? verify === "phone"
            ? "Check your phone"
            : "Your phone"
          : open === "password"
            ? passwordEnabled
              ? "Change password"
              : "Set a password"
            : "";

  const onSave =
    open === "name"
      ? saveName
      : open === "email"
        ? verify === "email"
          ? confirmEmail
          : sendEmailCode
        : open === "phone"
          ? verify === "phone"
            ? confirmPhone
            : sendPhoneCode
          : savePassword;

  const saveLabel =
    open === "email" && verify !== "email"
      ? "Send code"
      : open === "phone" && verify !== "phone"
        ? "Send code"
        : open === "email" || open === "phone"
          ? "Verify"
          : "Save";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";

  return (
    <View style={styles.wrap}>
      <LText variant="label" tone="muted">
        Personal information
      </LText>

      <View style={[styles.grid, stacked && styles.gridStacked]}>
        <IdentityCell
          label="Name"
          value={fullName}
          action="Change"
          onPress={() => resetDrafts("name")}
          ruleRight={!stacked}
          ruleBottom={stacked}
        />
        <IdentityCell
          label="Email"
          value={email || "—"}
          action="Change"
          onPress={() => resetDrafts("email")}
          ruleBottom={stacked}
        />
        <IdentityCell
          label="Phone"
          value={displayPhone(phone)}
          action={phone ? "Change" : "Add"}
          onPress={() => resetDrafts("phone")}
          ruleRight={!stacked}
          ruleTop={!stacked}
          ruleBottom={stacked}
        />
        <IdentityCell
          label="Password"
          value={passwordEnabled ? "••••••••" : "Not set"}
          action={passwordEnabled ? "Change" : "Set"}
          onPress={() => resetDrafts("password")}
          ruleTop={!stacked}
        />
      </View>

      <Modal
        visible={open != null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.dialogBackdrop}
            onPress={close}
            accessibilityLabel="Close"
          />
          <View nativeID="skoun-profile-dialog" style={styles.dialog}>
            <View style={styles.dialogHead}>
              <LText variant="subtitle">{title}</LText>
              <Pressable
                onPress={close}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.dialogClose}
              >
                <Ionicons name="close" size={20} color={Skoun.color.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.dialogBody}
              keyboardShouldPersistTaps="handled"
            >
              {open === "name" ? (
                <View style={styles.nameRow}>
                  <Field
                    label="First name"
                    value={firstDraft}
                    onChangeText={setFirstDraft}
                    autoComplete="given-name"
                  />
                  <Field
                    label="Last name"
                    value={lastDraft}
                    onChangeText={setLastDraft}
                    autoComplete="family-name"
                  />
                </View>
              ) : null}

              {open === "email" && verify !== "email" ? (
                <Field
                  label="Email"
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              ) : null}

              {open === "phone" && verify !== "phone" ? (
                <Field
                  label="Mobile"
                  value={phoneDraft}
                  onChangeText={setPhoneDraft}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  hint="Lebanese number — 71 123 456"
                />
              ) : null}

              {verify ? (
                <Field
                  label="Verification code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  hint={
                    verify === "email"
                      ? `We sent a 6-digit code to ${emailDraft.trim().toLowerCase()}.`
                      : "We sent a 6-digit SMS code."
                  }
                />
              ) : null}

              {open === "password" ? (
                <View style={styles.stack}>
                  {passwordEnabled ? (
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      shown={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                    />
                  ) : (
                    <LText variant="caption" tone="muted">
                      You signed in without a password. Set one to also use
                      email next time.
                    </LText>
                  )}
                  <PasswordField
                    label="New password"
                    value={nextPassword}
                    onChangeText={setNextPassword}
                    shown={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                  <PasswordStrengthMeter password={nextPassword} />
                  <PasswordField
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    shown={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    invalid={passwordMismatch(nextPassword, confirmPassword)}
                  />
                </View>
              ) : null}

              {error ? (
                <LText
                  accessibilityRole="alert"
                  variant="caption"
                  tone="danger"
                >
                  {error}
                </LText>
              ) : null}

              <Pressable
                onPress={() => void onSave()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={saveLabel}
                style={({ pressed, hovered }: PressState) => [
                  styles.save,
                  (hovered || pressed) && styles.saveHover,
                  busy && styles.saveBusy,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <LText style={styles.saveText}>{saveLabel}</LText>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function IdentityCell({
  label,
  value,
  action,
  onPress,
  ruleRight,
  ruleTop,
  ruleBottom,
}: {
  label: string;
  value: string;
  action: string;
  onPress: () => void;
  ruleRight?: boolean;
  ruleTop?: boolean;
  ruleBottom?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. ${action}`}
      onPress={onPress}
      style={({ pressed, hovered }: PressState) => [
        styles.cell,
        ruleRight && styles.ruleRight,
        ruleTop && styles.ruleTop,
        ruleBottom && styles.ruleBottom,
        (hovered || pressed) && styles.cellHover,
      ]}
    >
      <LText variant="caption" tone="muted">
        {label}
      </LText>
      <LText variant="subtitle" style={styles.value} numberOfLines={1}>
        {value}
      </LText>
      <LText style={styles.change}>{action}</LText>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "email-address" | "phone-pad" | "number-pad" | "default";
  autoCapitalize?: "none" | "words" | "sentences";
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <LText variant="caption" tone="muted">
        {label}
      </LText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        autoCorrect={false}
        placeholderTextColor={Skoun.color.inkFaint}
        accessibilityLabel={label}
        style={styles.input}
      />
      {hint ? (
        <LText variant="caption" tone="faint">
          {hint}
        </LText>
      ) : null}
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  shown,
  onToggle,
  invalid,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  shown: boolean;
  onToggle: () => void;
  invalid?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.passwordLabel}>
        <LText variant="caption" tone="muted">
          {label}
        </LText>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={shown ? "Hide password" : "Show password"}
          hitSlop={8}
        >
          <LText style={styles.showHide}>{shown ? "Hide" : "Show"}</LText>
        </Pressable>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        accessibilityLabel={label}
        style={[styles.input, invalid && styles.inputInvalid]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
  } as Record<string, unknown>,
  gridStacked: {
    gridTemplateColumns: "1fr",
  } as Record<string, unknown>,
  cell: {
    minWidth: 0,
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 20,
    cursor: "pointer",
  },
  cellHover: {
    backgroundColor: "rgba(47, 111, 237, 0.04)",
  },
  ruleRight: {
    borderRightWidth: 1,
    borderRightColor: Skoun.color.border,
  },
  ruleTop: {
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
  },
  ruleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  value: {
    fontSize: 16,
    color: Skoun.color.primaryDeep,
  },
  change: {
    marginTop: 4,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.primary,
  },
  dialogRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: 640,
    backgroundColor: Skoun.color.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
    zIndex: 2,
  },
  dialogHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  dialogClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  dialogBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  stack: {
    gap: 14,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  input: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.ink,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    paddingHorizontal: 14,
    backgroundColor: Skoun.color.surface,
  },
  inputInvalid: {
    borderColor: Skoun.color.danger,
  },
  passwordLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  showHide: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.ink,
    letterSpacing: 0.4,
  },
  save: {
    height: 48,
    borderRadius: 999,
    backgroundColor: Skoun.color.ink,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  saveHover: {
    backgroundColor: Skoun.color.primaryDeep,
  },
  saveBusy: {
    opacity: 0.7,
  },
  saveText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
