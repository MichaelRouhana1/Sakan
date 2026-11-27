import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InstitutionCampusPicker } from "@/components/auth/InstitutionCampusPicker";
import { StudentlyAuthModal } from "@/components/auth/StudentlyAuthModal";
import { PersonalInfoModal } from "@/components/profile/PersonalInfoModal";
import { ProfileModePill, type ProfileMode } from "@/components/profile/ProfileModePill";
import {
  CollapsingHeaderBar,
  useCollapsingHeader,
} from "@/components/ui/CollapsingHeader";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Studently } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useSavedListings } from "@/features/saved/useSavedListings";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

const SUPPORT_EMAIL = "hello@studently.app";

const SURFACE = {
  ground: "#FFFFFF",
  subtle: "#F7F6F3",
  pressed: "#F2F0EC",
  divider: "#ECEAE6",
  border: "#DEDAD3",
  ink: "#1A1A1A",
  muted: "#5E5A55",
  faint: "#8A847C",
  dangerBg: "#FEF3F2",
  dangerBorder: "#F5C2C0",
} as const;

function initialsFor(user: User | null): string {
  const first = user?.firstName?.trim().charAt(0) ?? "";
  const last = user?.lastName?.trim().charAt(0) ?? "";
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return (user?.email?.trim().charAt(0) || "S").toUpperCase();
}

function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function hapticTap() {
  if (Platform.OS !== "web") {
    void Haptics.selectionAsync().catch(() => {});
  }
}

export function MobileProfileScreen({ mode = "renter" }: { mode?: ProfileMode }) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, hasClerkSession, user, logout, refreshUser } =
    useAuthSession();
  const saved = useSavedListings();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [savingCampusId, setSavingCampusId] = useState<string | null>(null);
  const [campusError, setCampusError] = useState<string | null>(null);
  const campusSaving = Boolean(savingCampusId);

  const profileHeader = useCollapsingHeader({ defaultThreshold: 52 });
  const campusHeader = useCollapsingHeader({
    defaultThreshold: 44,
    extraTopOffset: 8,
  });
  const privacyHeader = useCollapsingHeader({
    defaultThreshold: 44,
    extraTopOffset: 8,
  });

  useEffect(() => {
    if (!campusOpen) campusHeader.reset();
  }, [campusOpen, campusHeader.reset]);

  useEffect(() => {
    if (!privacyOpen) privacyHeader.reset();
  }, [privacyOpen, privacyHeader.reset]);

  useEffect(() => {
    if (isSignedIn) {
      void refreshUser();
    }
  }, [isSignedIn, refreshUser]);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Signed in"
    : "Guest";
  const initials = initialsFor(user);
  const memberSince = formatMemberSince(user?.createdAt);
  const savedCount = isSignedIn ? (saved.data?.length ?? 0) : 0;

  const requireAuth = (action: () => void) => {
    hapticTap();
    if (isSignedIn) action();
    else setAuthModalOpen(true);
  };

  const handleSupport = async () => {
    hapticTap();
    const url = `mailto:${SUPPORT_EMAIL}?subject=Studently%20Support`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      /* fall through to alert */
    }
    Alert.alert(
      "Help & support",
      `Email us anytime at ${SUPPORT_EMAIL}. We read every note about listings, campus tools, and your account.`,
    );
  };

  const handleLogout = async () => {
    hapticTap();
    await logout();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.scrollStage}>
        <HideIosTabScrollFade style={styles.scrollFadeWrap}>
          <Animated.ScrollView
            onScroll={profileHeader.onScroll}
            scrollEventThrottle={profileHeader.scrollEventThrottle}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: appleTabScrollInset + 88 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* SCREEN TITLE */}
            <Animated.Text
              style={[styles.pageTitle, profileHeader.largeTitleStyle]}
              onLayout={profileHeader.onLargeTitleLayout}
              accessibilityRole="header"
            >
              Profile
            </Animated.Text>

          {/* IDENTITY MASTHEAD */}
          {isSignedIn ? (
            <Pressable
              onPress={() => {
                hapticTap();
                setPersonalInfoOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${displayName}. Open personal information`}
              style={({ pressed }) => [
                styles.identityMasthead,
                pressed && styles.pressedSubtle,
              ]}
            >
              <View style={styles.monogram}>
                <Text style={styles.monogramText}>{initials}</Text>
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.identityEmail} numberOfLines={1}>
                  {user?.email || user?.phone || "Studently member"}
                </Text>
                {memberSince ? (
                  <Text style={styles.identityMeta}>
                    Member since {memberSince}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={SURFACE.faint}
              />
            </Pressable>
          ) : (
            <View style={styles.guestPanel}>
              <Text style={styles.guestTitle}>Browse as yourself</Text>
              <Text style={styles.guestBody}>
                Pin your campus, keep a shortlist of rooms, and sync across
                devices.
              </Text>
              <Pressable
                onPress={() => {
                  hapticTap();
                  setAuthModalOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign in or create account"
                style={({ pressed }) => [
                  styles.signInBtn,
                  pressed && styles.signInBtnPressed,
                ]}
              >
                <Text style={styles.signInBtnText}>
                  Sign in or create account
                </Text>
              </Pressable>
            </View>
          )}

          {/* FEATURED CAMPUS ANCHOR */}
          <Pressable
            onPress={() =>
              requireAuth(() => {
                setCampusError(null);
                setCampusOpen(true);
              })
            }
            accessibilityRole="button"
            accessibilityLabel={
              user?.campus
                ? `My campus, ${user.campus.displayName}. Change campus`
                : "My campus. Choose your university"
            }
            style={({ pressed }) => [
              styles.campusFeature,
              pressed && styles.campusFeaturePressed,
            ]}
          >
            {user?.campus ? (
              <InstitutionLogo
                slug={user.campus.institutionSlug}
                shortName={
                  user.campus.institutionShortName || user.campus.name
                }
                logoUrl={user.campus.logoUrl}
                size={44}
              />
            ) : (
              <View style={styles.campusIconPlaceholder}>
                <Ionicons
                  name="school-outline"
                  size={22}
                  color={Studently.color.primary}
                />
              </View>
            )}
            <View style={styles.campusFeatureCopy}>
              <Text style={styles.campusFeatureLabel}>My campus</Text>
              <Text style={styles.campusFeatureValue} numberOfLines={2}>
                {user?.campus
                  ? user.campus.displayName
                  : "Choose your university"}
              </Text>
              <Text style={styles.campusFeatureHint} numberOfLines={1}>
                {user?.campus
                  ? "Rooms & walk times follow this campus"
                  : "See nearby rooms and commute times"}
              </Text>
            </View>
            <Text
              style={[
                styles.campusActionText,
                !user?.campus && styles.campusActionPrimary,
              ]}
            >
              {user?.campus ? "Change" : "Choose"}
            </Text>
          </Pressable>

          {/* SECTION: ACCOUNT */}
          <Text style={styles.sectionHeading}>Account</Text>
          <View style={styles.sectionList}>
            <ProfileRow
              icon="person-outline"
              label="Personal information"
              subtitle="Name, email, phone & password"
              onPress={() => requireAuth(() => setPersonalInfoOpen(true))}
            />
            <ProfileRow
              icon="heart-outline"
              label="Shortlist & saved"
              subtitle={
                isSignedIn
                  ? savedCount === 0
                    ? "No rooms saved yet"
                    : `${savedCount} saved ${savedCount === 1 ? "room" : "rooms"}`
                  : "Rooms you’re comparing"
              }
              badge={savedCount > 0 ? String(savedCount) : undefined}
              onPress={() =>
                requireAuth(() => router.push("/saved" as never))
              }
              last
            />
          </View>

          {/* SECTION: SUPPORT & PRIVACY */}
          <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>
            Support & privacy
          </Text>
          <View style={styles.sectionList}>
            <ProfileRow
              icon="help-circle-outline"
              label="Help & support"
              subtitle={SUPPORT_EMAIL}
              onPress={() => void handleSupport()}
            />
            <ProfileRow
              icon="shield-checkmark-outline"
              label="Privacy & data"
              subtitle="Classifieds only · no booking fees"
              onPress={() => {
                hapticTap();
                setPrivacyOpen(true);
              }}
              last
            />
          </View>

          {/* LOGOUT ACTION */}
          {isSignedIn || hasClerkSession ? (
            <Pressable
              onPress={() => void handleLogout()}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.logoutBtnPressed,
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={Studently.color.danger}
              />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          ) : null}
          </Animated.ScrollView>
        </HideIosTabScrollFade>
        <CollapsingHeaderBar
          controller={profileHeader}
          title="Profile"
          variant="overlay"
          backgroundColor={SURFACE.ground}
          borderColor={SURFACE.divider}
          titleColor={SURFACE.ink}
          testID="profile-collapsing-header"
        />
      </View>

      <ProfileModePill
        mode={mode}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <StudentlyAuthModal
        visible={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      <PersonalInfoModal
        visible={personalInfoOpen}
        onClose={() => setPersonalInfoOpen(false)}
      />

      {/* MY CAMPUS SHEET */}
      <Modal
        visible={campusOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!campusSaving) setCampusOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.sheetRoot,
            { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 8 },
          ]}
        >
          <CollapsingHeaderBar
            controller={campusHeader}
            title="My campus"
            variant="bar"
            backgroundColor={SURFACE.ground}
            borderColor={SURFACE.divider}
            titleColor={SURFACE.ink}
            testID="campus-sheet-header"
            right={
              <Pressable
                onPress={() => {
                  if (!campusSaving) setCampusOpen(false);
                }}
                disabled={campusSaving}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close My campus"
                style={({ pressed }) => [
                  styles.sheetCloseBtn,
                  pressed && styles.pressedOpacity,
                ]}
              >
                <Ionicons name="close" size={20} color={SURFACE.ink} />
              </Pressable>
            }
          />

          <Animated.ScrollView
            onScroll={campusHeader.onScroll}
            scrollEventThrottle={campusHeader.scrollEventThrottle}
            contentContainerStyle={[
              styles.sheetScrollContent,
              { paddingBottom: Math.max(36, insets.bottom + 24) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {campusOpen ? (
              <>
                <View style={styles.sheetHeaderBlock}>
                  <Animated.Text
                    style={[styles.sheetTitle, campusHeader.largeTitleStyle]}
                    onLayout={campusHeader.onLargeTitleLayout}
                    accessibilityRole="header"
                  >
                    My campus
                  </Animated.Text>
                  <Text style={styles.sheetSub}>
                    Personalize nearby rooms, walk times, and campus perks.
                  </Text>
                </View>

                {user?.campus ? (
                  <View style={styles.currentCampusCard}>
                    <InstitutionLogo
                      slug={user.campus.institutionSlug}
                      shortName={
                        user.campus.institutionShortName || user.campus.name
                      }
                      logoUrl={user.campus.logoUrl}
                      size={42}
                    />
                    <View style={styles.currentCampusCopy}>
                      <Text style={styles.currentCampusLabel}>
                        Current campus
                      </Text>
                      <Text style={styles.currentCampusName} numberOfLines={2}>
                        {user.campus.displayName}
                      </Text>
                      {user.campus.city ? (
                        <Text style={styles.currentCampusCity}>
                          {user.campus.city}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.currentCampusBadge}>
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={Studently.color.primary}
                      />
                    </View>
                  </View>
                ) : null}

                {campusError ? (
                  <View
                    style={styles.campusErrorBanner}
                    accessibilityRole="alert"
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={Studently.color.danger}
                    />
                    <Text style={styles.campusErrorText}>{campusError}</Text>
                  </View>
                ) : null}

                <InstitutionCampusPicker
                  hideTitle
                  selectedCampusId={user?.campusId ?? null}
                  savingCampusId={savingCampusId}
                  onSelectCampus={async (campus) => {
                    if (campusSaving) return;
                    if (campus.id === user?.campusId) {
                      setCampusOpen(false);
                      return;
                    }
                    setCampusError(null);
                    setSavingCampusId(campus.id);
                    try {
                      await api.patch<{ data: User }>("/api/users/me/campus", {
                        campusId: campus.id,
                      });
                      await refreshUser();
                      void Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      ).catch(() => {});
                      setCampusOpen(false);
                    } catch {
                      setCampusError(
                        "Couldn’t update your campus. Check your connection and try again.",
                      );
                    } finally {
                      setSavingCampusId(null);
                    }
                  }}
                />
              </>
            ) : null}
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* PRIVACY & DATA SHEET */}
      <Modal
        visible={privacyOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyOpen(false)}
      >
        <View
          style={[
            styles.sheetRoot,
            { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 8 },
          ]}
        >
          <CollapsingHeaderBar
            controller={privacyHeader}
            title="Privacy & data"
            variant="bar"
            backgroundColor={SURFACE.ground}
            borderColor={SURFACE.divider}
            titleColor={SURFACE.ink}
            testID="privacy-sheet-header"
            right={
              <Pressable
                onPress={() => setPrivacyOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close Privacy and data"
                style={({ pressed }) => [
                  styles.sheetCloseBtn,
                  pressed && styles.pressedOpacity,
                ]}
              >
                <Ionicons name="close" size={20} color={SURFACE.ink} />
              </Pressable>
            }
          />

          <Animated.ScrollView
            onScroll={privacyHeader.onScroll}
            scrollEventThrottle={privacyHeader.scrollEventThrottle}
            contentContainerStyle={[
              styles.sheetScrollContent,
              { paddingBottom: Math.max(36, insets.bottom + 24) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHeaderBlock}>
              <Animated.Text
                style={[styles.sheetTitle, privacyHeader.largeTitleStyle]}
                onLayout={privacyHeader.onLargeTitleLayout}
                accessibilityRole="header"
              >
                Privacy & data
              </Animated.Text>
              <Text style={styles.sheetSub}>
                Plain language on how Studently handles your account.
              </Text>
            </View>

            <View style={styles.privacySection}>
              <PrivacyItem
                title="Classifieds only"
                body="Studently connects students directly with hosts. We never collect booking fees, store payment cards for rent, or act as a landlord middleman."
              />
              <PrivacyItem
                title="Your contact details stay private"
                body="Your email, phone number, and saved shortlist are never shared publicly. Hosts only hear from you when you choose to reach out."
              />
              <PrivacyItem
                title="Account & data requests"
                body={`You can edit your name, email, phone, and campus anytime in Profile. For account deletion or data questions, write ${SUPPORT_EMAIL}.`}
                last
              />
            </View>
          </Animated.ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  subtitle,
  badge,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={SURFACE.ink}
        style={styles.rowIcon}
      />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {badge ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={SURFACE.faint} />
      </View>
    </Pressable>
  );
}

function PrivacyItem({
  title,
  body,
  last = false,
}: {
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.privacyItem, !last && styles.rowBorder]}>
      <Text style={styles.privacyItemTitle}>{title}</Text>
      <Text style={styles.privacyItemBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.ground,
  },
  scrollStage: {
    flex: 1,
    position: "relative",
  },
  scrollFadeWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  pageTitle: {
    fontFamily: Studently.type.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: SURFACE.ink,
    marginBottom: 20,
  },

  // IDENTITY MASTHEAD
  identityMasthead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  pressedSubtle: {
    backgroundColor: SURFACE.pressed,
  },
  monogram: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: SURFACE.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 21,
    letterSpacing: 0.4,
    color: "#FFFFFF",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  identityName: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.2,
    color: SURFACE.ink,
  },
  identityEmail: {
    fontFamily: Studently.type.body,
    fontSize: 16,
    lineHeight: 22,
    color: SURFACE.muted,
  },
  identityMeta: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.faint,
    marginTop: 2,
  },

  // GUEST PANEL
  guestPanel: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: SURFACE.subtle,
    gap: 10,
    marginBottom: 20,
  },
  guestTitle: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.2,
    color: SURFACE.ink,
  },
  guestBody: {
    fontFamily: Studently.type.body,
    fontSize: 16,
    lineHeight: 23,
    color: SURFACE.muted,
  },
  signInBtn: {
    marginTop: 6,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: SURFACE.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  signInBtnPressed: {
    opacity: 0.88,
  },
  signInBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 17,
    color: "#FFFFFF",
  },

  // FEATURED CAMPUS ANCHOR
  campusFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: SURFACE.subtle,
    marginBottom: 8,
  },
  campusFeaturePressed: {
    backgroundColor: SURFACE.pressed,
  },
  campusIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  campusFeatureCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  campusFeatureLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: SURFACE.muted,
  },
  campusFeatureValue: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 17,
    lineHeight: 23,
    color: SURFACE.ink,
  },
  campusFeatureHint: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.faint,
  },
  campusActionText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 16,
    color: SURFACE.ink,
    textDecorationLine: "underline",
  },
  campusActionPrimary: {
    color: Studently.color.primary,
    textDecorationLine: "none",
  },

  // SECTIONS & ROWS
  sectionHeading: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0.1,
    color: SURFACE.muted,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeadingSpaced: {
    marginTop: 28,
  },
  sectionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 68,
    paddingVertical: 16,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  rowPressed: {
    backgroundColor: SURFACE.pressed,
  },
  rowIcon: {
    width: 26,
    textAlign: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 18,
    lineHeight: 24,
    color: SURFACE.ink,
  },
  rowSubtitle: {
    fontFamily: Studently.type.body,
    fontSize: 15,
    lineHeight: 21,
    color: SURFACE.muted,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: SURFACE.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    color: SURFACE.ink,
  },

  // LOGOUT
  logoutBtn: {
    marginTop: 32,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: SURFACE.dangerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutBtnPressed: {
    opacity: 0.82,
  },
  logoutText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 17,
    color: Studently.color.danger,
  },

  // SHARED SHEET CHROME
  sheetRoot: {
    flex: 1,
    backgroundColor: SURFACE.ground,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedOpacity: {
    opacity: 0.72,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 18,
  },
  sheetHeaderBlock: {
    gap: 6,
    paddingBottom: 4,
  },
  sheetTitle: {
    fontFamily: Studently.type.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: SURFACE.ink,
  },
  sheetSub: {
    fontFamily: Studently.type.body,
    fontSize: 16,
    lineHeight: 24,
    color: SURFACE.muted,
  },

  // CURRENT CAMPUS CARD (INSIDE CAMPUS SHEET)
  currentCampusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Studently.color.primaryMist,
    borderWidth: 1,
    borderColor: Studently.color.primarySoft,
  },
  currentCampusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  currentCampusLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Studently.color.primary,
  },
  currentCampusName: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 17,
    lineHeight: 23,
    color: SURFACE.ink,
  },
  currentCampusCity: {
    fontFamily: Studently.type.body,
    fontSize: 15,
    color: SURFACE.muted,
  },
  currentCampusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  campusErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: SURFACE.dangerBg,
    borderWidth: 1,
    borderColor: SURFACE.dangerBorder,
  },
  campusErrorText: {
    flex: 1,
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Studently.color.danger,
  },

  // PRIVACY SHEET
  privacySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  privacyItem: {
    paddingVertical: 20,
    gap: 8,
  },
  privacyItemTitle: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    color: SURFACE.ink,
  },
  privacyItemBody: {
    fontFamily: Studently.type.body,
    fontSize: 16,
    lineHeight: 24,
    color: SURFACE.muted,
  },
});
