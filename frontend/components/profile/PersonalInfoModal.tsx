import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Studently } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { syncIdentityFromClerk } from "@/features/auth/userApi";
import { useClerkEnabled } from "@/lib/clerkEnabled";
import {
  parseLebanonNumber,
  toE164,
  toNationalDisplay,
} from "@/lib/lebanonPhone";
import {
  passwordMeetsPolicy,
  passwordMismatch,
} from "@/lib/passwordStrength";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Field = "name" | "email" | "phone" | "password";
type VerifyKind = "email" | "phone" | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SURFACE = {
  ground: "#FFFFFF",
  subtle: "#F7F6F3",
  pressed: "#F4F2EE",
  divider: "#ECEAE6",
  border: "#DEDAD3",
  ink: "#1A1A1A",
  muted: "#5E5A55",
  faint: "#8A847C",
  verifiedBg: "#EEF8F1",
  verifiedInk: "#166534",
  errorBg: "#FEF3F2",
  errorBorder: "#F5C2C0",
} as const;

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
  if (!raw) return "";
  const parsed = parseLebanonNumber(raw);
  return parsed ? toNationalDisplay(parsed) : raw;
}

function initialsFor(first: string, last: string, email: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  return (email.trim().charAt(0) || "S").toUpperCase();
}

function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function providerLabel(raw: string): string {
  const clean = raw.replace(/^oauth_/i, "").toLowerCase();
  if (clean === "google") return "Google";
  if (clean === "apple") return "Apple";
  if (clean === "facebook") return "Facebook";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PersonalInfoModal({ visible, onClose }: Props) {
  const clerkEnabled = useClerkEnabled();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {visible ? (
        clerkEnabled ? (
          <ClerkBackedPersonalInfo visible={visible} onClose={onClose} />
        ) : (
          <PersonalInfoBody visible={visible} onClose={onClose} clerkUser={null} />
        )
      ) : null}
    </Modal>
  );
}

function ClerkBackedPersonalInfo({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user: clerkUser } = useUser();
  return (
    <PersonalInfoBody
      visible={visible}
      onClose={onClose}
      clerkUser={clerkUser ?? null}
    />
  );
}

type ClerkUserObj = ReturnType<typeof useUser>["user"];

function PersonalInfoBody({
  visible,
  onClose,
  clerkUser,
}: {
  visible: boolean;
  onClose: () => void;
  clerkUser: ClerkUserObj;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { user, refreshUser } = useAuthSession();

  const firstName =
    clerkUser?.firstName?.trim() || user?.firstName?.trim() || "";
  const lastName = clerkUser?.lastName?.trim() || user?.lastName?.trim() || "";
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress || user?.email || "";
  const emailVerified =
    clerkUser?.primaryEmailAddress?.verification?.status === "verified" ||
    Boolean(user?.emailVerifiedAt);
  const phone =
    clerkUser?.primaryPhoneNumber?.phoneNumber || user?.phone || "";
  const phoneVerified =
    clerkUser?.primaryPhoneNumber?.verification?.status === "verified";
  const passwordEnabled = Boolean(clerkUser?.passwordEnabled);
  const memberSince = formatMemberSince(user?.createdAt);
  const connectedProviders = Array.from(
    new Set(
      (clerkUser?.externalAccounts ?? [])
        .map((acc) => (acc.provider ? providerLabel(String(acc.provider)) : ""))
        .filter(Boolean),
    ),
  );

  const [editing, setEditing] = useState<Field | null>(null);
  const [verify, setVerify] = useState<VerifyKind>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstDraft, setFirstDraft] = useState("");
  const [lastDraft, setLastDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!visible) {
      setEditing(null);
      setVerify(null);
      setError(null);
      setNotice(null);
      setCode("");
      setBusy(false);
      setResending(false);
    }
  }, [visible]);

  const triggerSelectionHaptic = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
  };

  const openField = (field: Field) => {
    if (busy) return;
    if (!clerkUser) {
      setError("Account editing isn’t available right now. Try again shortly.");
      return;
    }
    triggerSelectionHaptic();
    setError(null);
    setNotice(null);
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
    setEditing(field);
  };

  const backToOverview = (successMessage?: string) => {
    setError(null);
    setVerify(null);
    setCode("");
    setShowPassword(false);
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setEditing(null);
    if (successMessage) {
      setNotice(successMessage);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    }
  };

  const persistIdentity = async () => {
    await clerkUser?.reload();
    try {
      await syncIdentityFromClerk();
    } catch {
      try {
        await syncIdentityFromClerk();
      } catch {
        /* Clerk is authoritative; Studently DB catches up on next load. */
      }
    }
    await refreshUser();
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
      await clerkUser.update({ firstName: first, lastName: last || "" });
      await persistIdentity();
      backToOverview("Name updated.");
    } catch (err) {
      setError(clerkMessage(err, "Could not update your name."));
    } finally {
      setBusy(false);
    }
  };

  const sendEmailCode = async (isResend = false) => {
    if (!clerkUser) return;
    const next = emailDraft.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) {
      setError("Enter a valid email address.");
      return;
    }
    if (next === email.toLowerCase()) {
      setError("That’s already your current email.");
      return;
    }
    if (isResend) setResending(true);
    else setBusy(true);
    setError(null);
    try {
      const existing = clerkUser.emailAddresses.find(
        (entry) => entry.emailAddress.toLowerCase() === next,
      );
      const target =
        existing ?? (await clerkUser.createEmailAddress({ email: next }));
      await target.prepareVerification({ strategy: "email_code" });
      setVerify("email");
    } catch (err) {
      setError(clerkMessage(err, "Could not send a verification code."));
    } finally {
      setBusy(false);
      setResending(false);
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
      await persistIdentity();
      backToOverview("Email verified and updated.");
    } catch (err) {
      setError(clerkMessage(err, "Incorrect code. Check your email and try again."));
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneCode = async (isResend = false) => {
    if (!clerkUser) return;
    const e164 = toPhoneE164(phoneDraft);
    if (!e164) {
      setError("Enter a Lebanese mobile (like 71 123 456) or +country code.");
      return;
    }
    if (phone && toPhoneE164(phone) === e164) {
      setError("That’s already your current number.");
      return;
    }
    if (isResend) setResending(true);
    else setBusy(true);
    setError(null);
    try {
      const existing = clerkUser.phoneNumbers.find(
        (entry) => entry.phoneNumber === e164,
      );
      const target =
        existing ?? (await clerkUser.createPhoneNumber({ phoneNumber: e164 }));
      await target.prepareVerification();
      setVerify("phone");
    } catch (err) {
      setError(clerkMessage(err, "Could not send an SMS verification code."));
    } finally {
      setBusy(false);
      setResending(false);
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
      await persistIdentity();
      backToOverview("Phone number verified and updated.");
    } catch (err) {
      setError(clerkMessage(err, "Incorrect code. Check your SMS and try again."));
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
      setError("Meet all requirements in the checklist below.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New passwords do not match.");
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
      await persistIdentity();
      backToOverview(passwordEnabled ? "Password updated." : "Password set.");
    } catch (err) {
      setError(clerkMessage(err, "Could not update your password."));
    } finally {
      setBusy(false);
    }
  };

  const editHeading =
    editing === "name"
      ? "Legal name"
      : editing === "email"
        ? verify === "email"
          ? "Verify your email"
          : "Email address"
        : editing === "phone"
          ? verify === "phone"
            ? "Verify your number"
            : phone
              ? "Change phone number"
              : "Add phone number"
          : editing === "password"
            ? passwordEnabled
              ? "Update password"
              : "Set a password"
            : "";

  const editDescription =
    editing === "name"
      ? "Use the name shown on your university ID or student housing lease."
      : editing === "email"
        ? verify === "email"
          ? `Enter the 6-digit code sent to ${emailDraft.trim().toLowerCase()}.`
          : "We’ll send a 6-digit code to verify your new address before switching."
        : editing === "phone"
          ? verify === "phone"
            ? `Enter the 6-digit SMS code sent to ${phoneDraft.trim()}.`
            : "Used for account recovery and quick coordination with hosts."
          : editing === "password"
            ? passwordEnabled
              ? "Updating your password signs out any other active sessions."
              : "Add a password so you can also sign in directly with your email."
            : "";

  const onSubmit =
    editing === "name"
      ? saveName
      : editing === "email"
        ? verify === "email"
          ? confirmEmail
          : () => sendEmailCode(false)
        : editing === "phone"
          ? verify === "phone"
            ? confirmPhone
            : () => sendPhoneCode(false)
          : savePassword;

  const submitLabel =
    editing === "email" && verify !== "email"
      ? "Send verification code"
      : editing === "phone" && verify !== "phone"
        ? "Send SMS code"
        : editing === "email" || editing === "phone"
          ? "Verify & save"
          : editing === "password" && !passwordEnabled
            ? "Set password"
            : "Save";

  const canSubmit = (() => {
    if (busy) return false;
    if (editing === "name") {
      const f = firstDraft.trim();
      const l = lastDraft.trim();
      return Boolean(f) && (f !== firstName || l !== lastName);
    }
    if (editing === "email") {
      return verify === "email"
        ? code.trim().length === 6
        : emailDraft.trim().length > 0;
    }
    if (editing === "phone") {
      return verify === "phone"
        ? code.trim().length === 6
        : phoneDraft.trim().length > 0;
    }
    if (editing === "password") {
      return Boolean(
        nextPassword &&
          confirmPassword &&
          (!passwordEnabled || currentPassword),
      );
    }
    return false;
  })();

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials = initialsFor(firstName, lastName, email);
  const formattedPhone = displayPhone(phone);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.root,
        { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 8 },
      ]}
    >
      {/* Top chrome */}
      <View style={styles.topBar}>
        {editing ? (
          <Pressable
            onPress={() => {
              if (!busy) {
                triggerSelectionHaptic();
                backToOverview();
              }
            }}
            disabled={busy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Personal info"
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.pressedPill,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={SURFACE.ink} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.topBarSpacer} />
        )}

        <Pressable
          onPress={() => {
            if (!busy) onClose();
          }}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close Personal info"
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && styles.pressedPill,
          ]}
        >
          <Ionicons name="close" size={20} color={SURFACE.ink} />
        </Pressable>
      </View>

      {!editing ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(36, insets.bottom + 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(180)}
          >
            {/* Editorial Masthead */}
            <View style={styles.masthead}>
              <View style={styles.mastheadCopy}>
                <Text style={styles.displayTitle} accessibilityRole="header">
                  Personal info
                </Text>
                <Text style={styles.mastheadMeta}>
                  {memberSince
                    ? `Member since ${memberSince} · Synced across devices`
                    : "Synced across your Studently account"}
                </Text>
              </View>
              <View
                style={styles.monogram}
                accessibilityLabel={`Account initials ${initials}`}
              >
                <Text style={styles.monogramText}>{initials}</Text>
              </View>
            </View>

            {notice ? (
              <View style={styles.successBanner} accessibilityRole="text">
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={SURFACE.verifiedInk}
                />
                <Text style={styles.successText}>{notice}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={Studently.color.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Section 1: Account Details */}
            <Text style={styles.sectionHeading}>Account details</Text>
            <View style={styles.sectionRuleTop}>
              <EditorialRow
                label="Legal name"
                value={fullName || undefined}
                placeholder="Add the name on your student ID"
                action={fullName ? "Edit" : "Add"}
                emphasizeAction={!fullName}
                onPress={() => openField("name")}
              />
              <EditorialRow
                label="Email address"
                value={email || undefined}
                placeholder="Add an email for confirmations and login"
                verified={Boolean(email) && emailVerified}
                action={email ? "Edit" : "Add"}
                emphasizeAction={!email}
                onPress={() => openField("email")}
              />
              <EditorialRow
                label="Phone number"
                value={formattedPhone || undefined}
                placeholder="Add a Lebanese mobile for host replies and recovery"
                verified={Boolean(phone) && phoneVerified}
                action={phone ? "Edit" : "Add"}
                emphasizeAction={!phone}
                onPress={() => openField("phone")}
                last
              />
            </View>

            {/* Section 2: Sign-in & Security */}
            <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>
              Sign-in & security
            </Text>
            <View style={styles.sectionRuleTop}>
              <EditorialRow
                label="Password"
                value={passwordEnabled ? "••••••••••••" : undefined}
                placeholder="Set a password to also sign in directly with email"
                action={passwordEnabled ? "Update" : "Set up"}
                emphasizeAction={!passwordEnabled}
                onPress={() => openField("password")}
                last={connectedProviders.length === 0}
              />

              {connectedProviders.length > 0 ? (
                <View style={styles.staticRow}>
                  <View style={styles.rowTopLine}>
                    <Text style={styles.rowLabel}>Connected sign-in</Text>
                    <View style={styles.connectedChip}>
                      <Text style={styles.connectedChipText}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.rowValue}>
                    {connectedProviders.join(" · ")}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Trust Footer */}
            <View style={styles.trustNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={SURFACE.muted}
                style={styles.trustIcon}
              />
              <Text style={styles.trustText}>
                Your contact details stay private until you reach out to a host.
                Edits update your login and profile everywhere at once.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.editScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={`${editing}-${verify ?? "form"}`}
              entering={reducedMotion ? undefined : FadeIn.duration(160)}
              style={styles.editContainer}
            >
              <View style={styles.editHeader}>
                <Text style={styles.editTitle} accessibilityRole="header">
                  {editHeading}
                </Text>
                <Text style={styles.editDescription}>{editDescription}</Text>
              </View>

              {editing === "name" ? (
                <View style={styles.formStack}>
                  <EditorialInput
                    label="First name"
                    value={firstDraft}
                    onChangeText={setFirstDraft}
                    placeholder="First name"
                    autoCapitalize="words"
                    textContentType="givenName"
                    autoFocus
                  />
                  <EditorialInput
                    label="Last name"
                    value={lastDraft}
                    onChangeText={setLastDraft}
                    placeholder="Last name"
                    autoCapitalize="words"
                    textContentType="familyName"
                  />
                </View>
              ) : null}

              {editing === "email" && verify !== "email" ? (
                <EditorialInput
                  label="New email address"
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  placeholder="name@university.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  autoFocus
                />
              ) : null}

              {editing === "phone" && verify !== "phone" ? (
                <EditorialInput
                  label="Mobile number"
                  value={phoneDraft}
                  onChangeText={setPhoneDraft}
                  placeholder="71 123 456"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  textContentType="telephoneNumber"
                  hint="Lebanese mobile (e.g. 71 123 456) or international format (+961…)."
                  autoFocus
                />
              ) : null}

              {verify ? (
                <View style={styles.formStack}>
                  <CodeInput
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
                  />
                  <View style={styles.codeActions}>
                    <Pressable
                      disabled={busy || resending}
                      onPress={() =>
                        void (verify === "email"
                          ? sendEmailCode(true)
                          : sendPhoneCode(true))
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.inlineActionBtn,
                        pressed && styles.pressedText,
                      ]}
                    >
                      <Text style={styles.inlineActionStrong}>
                        {resending ? "Sending…" : "Resend code"}
                      </Text>
                    </Pressable>
                    <Text style={styles.codeDot}>·</Text>
                    <Pressable
                      disabled={busy || resending}
                      onPress={() => {
                        setVerify(null);
                        setCode("");
                        setError(null);
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.inlineActionBtn,
                        pressed && styles.pressedText,
                      ]}
                    >
                      <Text style={styles.inlineActionMuted}>
                        {verify === "email"
                          ? "Change email"
                          : "Change number"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {editing === "password" ? (
                <View style={styles.formStack}>
                  {passwordEnabled ? (
                    <EditorialPasswordInput
                      label="Current password"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      shown={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      autoFocus
                    />
                  ) : null}
                  <EditorialPasswordInput
                    label="New password"
                    value={nextPassword}
                    onChangeText={setNextPassword}
                    shown={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    autoFocus={!passwordEnabled}
                  />
                  <View style={styles.meterWrap}>
                    <PasswordStrengthMeter password={nextPassword} />
                  </View>
                  <EditorialPasswordInput
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    shown={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    invalid={passwordMismatch(nextPassword, confirmPassword)}
                  />
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={Studently.color.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>

          {/* Sticky Footer Action Bar */}
          <View
            style={[
              styles.footerBar,
              { paddingBottom: Math.max(18, insets.bottom + 12) },
            ]}
          >
            <Pressable
              onPress={() => void onSubmit()}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled: !canSubmit, busy }}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
                pressed && canSubmit && styles.primaryBtnPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryBtnText,
                    !canSubmit && styles.primaryBtnTextDisabled,
                  ]}
                >
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function EditorialRow({
  label,
  value,
  placeholder,
  verified = false,
  action,
  emphasizeAction = false,
  onPress,
  last = false,
}: {
  label: string;
  value?: string;
  placeholder: string;
  verified?: boolean;
  action: string;
  emphasizeAction?: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value ?? placeholder}. ${action}`}
      style={({ pressed }) => [
        styles.editorialRow,
        !last && styles.rowBorderBottom,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowTopLine}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={[
            styles.rowAction,
            emphasizeAction && styles.rowActionPrimary,
          ]}
        >
          {action}
        </Text>
      </View>

      {value ? (
        <View style={styles.rowValueWrap}>
          <Text style={styles.rowValue}>{value}</Text>
          {verified ? (
            <View style={styles.verifiedPill}>
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={SURFACE.verifiedInk}
              />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.rowPlaceholder}>{placeholder}</Text>
      )}
    </Pressable>
  );
}

function EditorialInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  textContentType,
  hint,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "email-address" | "phone-pad" | "number-pad" | "default";
  autoCapitalize?: "none" | "words" | "sentences";
  textContentType?:
    | "givenName"
    | "familyName"
    | "emailAddress"
    | "telephoneNumber";
  hint?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={SURFACE.faint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        autoCorrect={false}
        autoFocus={autoFocus}
        textContentType={textContentType}
        accessibilityLabel={label}
        style={[styles.input, focused && styles.inputFocused]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function CodeInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>6-digit code</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="000000"
        placeholderTextColor="#C9C4BC"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        accessibilityLabel="6-digit verification code"
        style={[styles.codeInput, focused && styles.inputFocused]}
      />
    </View>
  );
}

function EditorialPasswordInput({
  label,
  value,
  onChangeText,
  shown,
  onToggle,
  invalid = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  shown: boolean;
  onToggle: () => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.passwordHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={shown ? "Hide password" : "Show password"}
        >
          <Text style={styles.showHide}>{shown ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        textContentType="password"
        accessibilityLabel={label}
        style={[
          styles.input,
          focused && styles.inputFocused,
          invalid && styles.inputInvalid,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.ground,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  topBarSpacer: {
    width: 44,
    height: 44,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingRight: 12,
    marginLeft: -6,
  },
  backBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: SURFACE.ink,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedPill: {
    opacity: 0.72,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  // Editorial Masthead
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 24,
  },
  mastheadCopy: {
    flex: 1,
    gap: 6,
  },
  displayTitle: {
    fontFamily: Studently.type.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
    color: SURFACE.ink,
  },
  mastheadMeta: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.muted,
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACE.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 16,
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },

  // Sections & Full-Width Editorial Rows
  sectionHeading: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    color: SURFACE.muted,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionHeadingSpaced: {
    marginTop: 32,
  },
  sectionRuleTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  editorialRow: {
    paddingVertical: 18,
    minHeight: 72,
    justifyContent: "center",
    gap: 6,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  staticRow: {
    paddingVertical: 18,
    gap: 6,
  },
  rowBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  rowPressed: {
    backgroundColor: SURFACE.pressed,
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: SURFACE.ink,
  },
  rowAction: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.ink,
    textDecorationLine: "underline",
  },
  rowActionPrimary: {
    color: Studently.color.primary,
    textDecorationLine: "none",
  },
  rowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  rowValue: {
    fontFamily: Studently.type.body,
    fontSize: 15,
    lineHeight: 22,
    color: SURFACE.muted,
  },
  rowPlaceholder: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.faint,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Studently.radius.pill,
    backgroundColor: SURFACE.verifiedBg,
  },
  verifiedText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 11,
    color: SURFACE.verifiedInk,
  },
  connectedChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Studently.radius.pill,
    backgroundColor: SURFACE.subtle,
  },
  connectedChipText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    color: SURFACE.muted,
  },

  // Trust note
  trustNote: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: SURFACE.subtle,
  },
  trustIcon: {
    marginTop: 2,
  },
  trustText: {
    flex: 1,
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: SURFACE.muted,
  },

  // Edit screen
  editScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  editContainer: {
    gap: 24,
  },
  editHeader: {
    gap: 8,
  },
  editTitle: {
    fontFamily: Studently.type.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: SURFACE.ink,
  },
  editDescription: {
    fontFamily: Studently.type.body,
    fontSize: 15,
    lineHeight: 22,
    color: SURFACE.muted,
  },
  formStack: {
    gap: 18,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    color: SURFACE.ink,
  },
  fieldHint: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: SURFACE.muted,
  },
  input: {
    fontFamily: Studently.type.body,
    fontSize: 16,
    color: SURFACE.ink,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE.ground,
  },
  inputFocused: {
    borderColor: SURFACE.ink,
    borderWidth: 1.5,
  },
  inputInvalid: {
    borderColor: Studently.color.danger,
  },
  codeInput: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: "center",
    color: SURFACE.ink,
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE.subtle,
    fontVariant: ["tabular-nums"],
  },
  codeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineActionBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  inlineActionStrong: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    color: SURFACE.ink,
    textDecorationLine: "underline",
  },
  inlineActionMuted: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    color: SURFACE.muted,
  },
  codeDot: {
    color: SURFACE.faint,
    fontSize: 14,
  },
  pressedText: {
    opacity: 0.65,
  },
  passwordHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  showHide: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    color: SURFACE.ink,
    textDecorationLine: "underline",
  },
  meterWrap: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: SURFACE.subtle,
  },

  // Sticky footer
  footerBar: {
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
    backgroundColor: SURFACE.ground,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: SURFACE.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryBtnPressed: {
    opacity: 0.88,
  },
  primaryBtnDisabled: {
    backgroundColor: "#E8E6E1",
  },
  primaryBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 16,
    color: "#FFFFFF",
  },
  primaryBtnTextDisabled: {
    color: "#9A958E",
  },

  // Banners
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SURFACE.verifiedBg,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    color: SURFACE.verifiedInk,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SURFACE.errorBg,
    borderWidth: 1,
    borderColor: SURFACE.errorBorder,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: Studently.color.danger,
  },
});
