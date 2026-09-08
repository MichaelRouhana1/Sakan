import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { ProfileIdentityPanel } from "@/components/web/ProfileIdentityPanel";
import { InstitutionCampusPicker } from "@/components/auth/InstitutionCampusPicker";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { LText } from "@/components/lister/Typography";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useSavedListings } from "@/features/saved/useSavedListings";
import { api } from "@/lib/api";
import { formatFreshUsd } from "@/lib/format";
import { listingCardTitle } from "@/lib/listingCardMeta";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { PROFILE_CSS } from "@/styles/profileCssText";
import type { Listing } from "@/types/listing";
import type { User } from "@/types/user";

type PressState = { pressed: boolean; hovered?: boolean };

const web = Platform.OS === "web";
const SUPPORT_EMAIL = "hello@skoun.app";

function useLayoutWidth() {
  const { width } = useWindowDimensions();
  const [inner, setInner] = useState(() =>
    web && typeof window !== "undefined" ? window.innerWidth : width,
  );
  useEffect(() => {
    if (!web || typeof window === "undefined") return;
    const sync = () => setInner(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return web ? inner : width;
}

function displayNameOf(
  user: User | null,
  clerk?: { firstName?: string | null; lastName?: string | null } | null,
): string {
  const first = clerk?.firstName?.trim() || user?.firstName;
  const last = clerk?.lastName?.trim() || user?.lastName;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (!user) return "Guest";
  return user.email || "Signed in";
}

function initialsOf(
  user: User | null,
  clerk?: { firstName?: string | null; lastName?: string | null } | null,
): string {
  const first = (clerk?.firstName?.trim() || user?.firstName?.trim() || "").charAt(0);
  const last = (clerk?.lastName?.trim() || user?.lastName?.trim() || "").charAt(0);
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return (user?.email?.trim().charAt(0) || "S").toUpperCase();
}

function firstNameOf(
  user: User | null,
  clerk?: { firstName?: string | null } | null,
): string {
  return clerk?.firstName?.trim() || user?.firstName?.trim() || displayNameOf(user, clerk);
}

function memberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function coverOf(listing: Listing): string | null {
  return resolveMediaUrl(listing.coverUrl ?? listing.photos[0]?.url ?? null);
}

export function ProfileWeb() {
  const { isSignedIn, isLoading: authLoading, user, logout, refreshUser } =
    useAuthSession();
  const { user: clerkUser } = useUser();
  const saved = useSavedListings();
  const width = useLayoutWidth();
  const compact = width < 640;
  const stacked = width < 900;

  const [authOpen, setAuthOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [campusSaving, setCampusSaving] = useState(false);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const id = "skoun-profile-css";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    if (style.textContent !== PROFILE_CSS) {
      style.textContent = PROFILE_CSS;
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) void refreshUser();
  }, [isSignedIn, refreshUser]);

  const requireAuth = (action: () => void) => {
    if (isSignedIn) action();
    else setAuthOpen(true);
  };

  const listings = saved.data ?? [];
  const mosaic = listings.slice(0, 3);
  const campus = user?.campus ?? null;
  const since = memberSince(user?.createdAt);
  const hello = firstNameOf(user, clerkUser);
  const initials = initialsOf(user, clerkUser);
  const ledeEmail =
    clerkUser?.primaryEmailAddress?.emailAddress || user?.email;

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Skoun.color.primary} size="large" />
      </View>
    );
  }

  return (
    <View nativeID="skoun-profile" style={styles.page}>
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <View style={styles.kicker}>
            <LText style={styles.kickerText}>Account</LText>
          </View>
          {isSignedIn && since ? (
            <LText variant="caption" tone="muted">
              Member since {since}
            </LText>
          ) : null}
        </View>

        <View style={styles.identityRow}>
          <View style={styles.monogram}>
              <LText style={styles.monogramText}>{initials}</LText>
          </View>
          <View style={styles.heroText}>
            <LText
              accessibilityRole="header"
              variant="display"
              style={[styles.title, compact && styles.titleCompact]}
            >
              {isSignedIn ? hello : "Browse as yourself"}
            </LText>
            <LText
              variant="body"
              tone="muted"
              style={[styles.lede, compact && styles.ledeCompact]}
            >
              {isSignedIn
                ? [ledeEmail, campus?.displayName]
                    .filter(Boolean)
                    .join("  ·  ") || "Skoun member"
                : "Pin a campus, keep a shortlist, and pick up where you left off on any device."}
            </LText>
          </View>
        </View>

        {!isSignedIn ? (
          <Pressable
            onPress={() => setAuthOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={({ pressed, hovered }: PressState) => [
              styles.cta,
              styles.motion,
              (hovered || pressed) && styles.ctaHover,
            ]}
          >
            <LText style={styles.ctaText}>Sign in</LText>
            <Ionicons name="arrow-forward" size={16} color={Skoun.color.ink} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.rule} />
        <View
          style={[
            styles.board,
            stacked ? styles.boardStacked : styles.boardSplit,
          ]}
        >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            campus ? `Campus, ${campus.displayName}` : "Choose your campus"
          }
          onPress={() => requireAuth(() => setCampusOpen(true))}
          style={({ pressed, hovered }: PressState) => [
            styles.pane,
            stacked && styles.paneRuleBottom,
            (hovered || pressed) && styles.paneHover,
          ]}
        >
          <View style={styles.campusTop}>
            {campus ? (
              <InstitutionLogo
                shortName={
                  campus.institutionShortName ||
                  campus.institutionName ||
                  campus.name
                }
                slug={campus.institutionSlug}
                logoUrl={campus.logoUrl}
                size={48}
              />
            ) : (
              <Ionicons
                name="school-outline"
                size={22}
                color={Skoun.color.primary}
              />
            )}
            <View style={styles.campusCopy}>
              <LText variant="label" tone="muted">
                My campus
              </LText>
              <LText variant="subtitle" style={styles.campusName}>
                {campus?.displayName ?? "Not set yet"}
              </LText>
              <LText variant="caption" tone="muted" style={styles.campusHint}>
                {campus
                  ? "Listings, benefits, and walk times follow this campus."
                  : "Choose where you study so rooms and campus tools match you."}
              </LText>
            </View>
          </View>
          <View style={styles.campusActions}>
            <View style={styles.inlineLink}>
              <LText style={styles.inlineLinkText}>
                {campus ? "Change campus" : "Choose campus"}
              </LText>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={Skoun.color.primary}
              />
            </View>
            {campus ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open campus"
                onPress={(e) => {
                  e.stopPropagation();
                  router.push("/campus" as never);
                }}
                style={styles.inlineLink}
              >
                <LText style={styles.inlineGhostText}>Campus tools</LText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        {!stacked ? <View style={styles.vRule} /> : null}

        <Pressable
          nativeID="skoun-profile-shortlist"
          accessibilityRole="link"
          accessibilityLabel="Shortlist and saved listings"
          onPress={() => {
            if (!isSignedIn) {
              setAuthOpen(true);
              return;
            }
            router.push(
              (listings.length > 0 ? "/saved" : "/search") as never,
            );
          }}
          style={({ pressed, hovered }: PressState) => [
            styles.pane,
            (hovered || pressed) && styles.paneHover,
          ]}
        >
          <View style={styles.tileHead}>
            <View>
              <LText variant="label" tone="muted">
                Shortlist
              </LText>
              <LText variant="subtitle" style={styles.tileTitle}>
                {isSignedIn
                  ? listings.length === 0
                    ? "Nothing saved yet"
                    : `${listings.length} place${listings.length === 1 ? "" : "s"} saved`
                  : "Rooms you’re comparing"}
              </LText>
            </View>
            <View style={styles.inlineLink}>
              <LText style={styles.inlineLinkText}>
                {listings.length > 0 ? "Open shortlist" : "Browse rooms"}
              </LText>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={Skoun.color.primary}
              />
            </View>
          </View>

          {mosaic.length > 0 ? (
            <View nativeID="skoun-profile-mosaic" style={styles.mosaicRow}>
              {mosaic.map((listing, i) => {
                const uri = coverOf(listing);
                return (
                  <Pressable
                    key={listing.id}
                    accessibilityRole="link"
                    accessibilityLabel={listingCardTitle(listing)}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/listing/${listing.id}` as never);
                    }}
                    style={[styles.shot, i === 0 && styles.shotFirst]}
                  >
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.shotFallback}>
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color={Skoun.color.inkFaint}
                        />
                      </View>
                    )}
                    <View style={styles.shotCaption}>
                      <LText numberOfLines={1} style={styles.shotCaptionText}>
                        {formatFreshUsd(listing.monthlyRentUsd)}
                      </LText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <LText variant="caption" tone="muted" style={styles.emptyHint}>
              Heart a listing while browsing — it lands here so you can compare
              rooms side by side.
            </LText>
          )}
        </Pressable>
        </View>
      </View>

      {isSignedIn ? <ProfileIdentityPanel stacked={stacked} /> : null}

      <View style={styles.trioWrap}>
        <View style={styles.rule} />
        <View style={[styles.trio, stacked ? styles.trioStacked : styles.trioSplit]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Help and support"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          style={({ pressed, hovered }: PressState) => [
            styles.col,
            stacked && styles.colCompact,
            stacked && styles.colRuleBottom,
            (hovered || pressed) && styles.colHover,
          ]}
        >
          <Ionicons
            name="help-circle-outline"
            size={22}
            color={Skoun.color.primary}
          />
          <LText variant="subtitle" style={styles.colTitle}>
            Help & support
          </LText>
          <LText variant="caption" tone="muted" style={styles.colBody}>
            Write {SUPPORT_EMAIL}. We read every note — listings, campus,
            account.
          </LText>
        </Pressable>

        {!stacked ? <View style={styles.vRule} /> : null}

        <View style={[styles.colStatic, stacked && styles.colCompact]}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={Skoun.color.primary}
          />
          <LText variant="subtitle" style={styles.colTitle}>
            Privacy
          </LText>
          <LText variant="caption" tone="muted" style={styles.colBody}>
            Classifieds only — no booking fees, no card on file, no landlord
            middleman.
          </LText>
        </View>
        </View>
      </View>

      {isSignedIn ? (
        <Pressable
          onPress={() => void logout()}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed, hovered }: PressState) => [
            styles.signOut,
            (hovered || pressed) && styles.signOutHover,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={16}
            color={Skoun.color.danger}
          />
          <LText style={styles.signOutText}>Log out</LText>
        </Pressable>
      ) : null}

      <SkounAuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
      />

      <Modal
        visible={campusOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!campusSaving) setCampusOpen(false);
        }}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.dialogBackdrop}
            onPress={() => {
              if (!campusSaving) setCampusOpen(false);
            }}
            accessibilityLabel="Close campus picker"
          />
          <View nativeID="skoun-profile-dialog" style={styles.dialog}>
            <View style={styles.dialogHead}>
              <LText variant="subtitle">Your campus</LText>
              <Pressable
                onPress={() => {
                  if (!campusSaving) setCampusOpen(false);
                }}
                disabled={campusSaving}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.dialogClose}
              >
                <Ionicons name="close" size={20} color={Skoun.color.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.dialogBody}
              showsVerticalScrollIndicator={false}
            >
              {campusOpen ? (
                <InstitutionCampusPicker
                  selectedCampusId={user?.campusId ?? null}
                  onSelectCampus={async (campusRow) => {
                    setCampusSaving(true);
                    try {
                      await api.patch<{ data: User }>("/api/users/me/campus", {
                        campusId: campusRow.id,
                      });
                      await refreshUser();
                      setCampusOpen(false);
                    } finally {
                      setCampusSaving(false);
                    }
                  }}
                />
              ) : null}
            </ScrollView>
            {campusSaving ? (
              <View style={styles.dialogBusy}>
                <ActivityIndicator color={Skoun.color.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    gap: 32,
    paddingTop: 8,
    paddingBottom: 8,
  },
  center: {
    paddingVertical: 80,
    alignItems: "center",
  },
  hero: {
    gap: 18,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kicker: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
  },
  kickerText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: "#FFFFFF",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  monogram: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Skoun.color.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  monogramText: {
    fontFamily: Skoun.type.display,
    fontSize: 22,
    lineHeight: 26,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.1,
    color: Skoun.color.primaryDeep,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
  },
  ledeCompact: {
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Skoun.color.ink,
    cursor: "pointer",
  },
  ctaHover: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  ctaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  motion: web
    ? ({
        transitionProperty: "background-color, border-color",
        transitionDuration: "160ms",
        transitionTimingFunction: "ease",
      } as object)
    : {},
  rule: {
    width: "100%",
    height: 1,
    backgroundColor: Skoun.color.border,
  },
  boardWrap: {
    width: "100%",
  },
  board: {
    width: "100%",
  },
  boardSplit: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  boardStacked: {
    flexDirection: "column",
  },
  pane: {
    flex: 1,
    minWidth: 0,
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    cursor: "pointer",
    justifyContent: "space-between",
  },
  paneRuleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  vRule: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Skoun.color.border,
    marginVertical: 24,
  },
  paneHover: {
    backgroundColor: "rgba(47, 111, 237, 0.04)",
  },
  campusTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  campusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  campusName: {
    fontSize: 18,
    lineHeight: 24,
    color: Skoun.color.primaryDeep,
  },
  campusHint: {
    lineHeight: 20,
  },
  campusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  tileHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  tileTitle: {
    marginTop: 4,
    color: Skoun.color.primaryDeep,
  },
  inlineLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  inlineLinkText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.primary,
  },
  inlineGhostText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  mosaicRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    height: 128,
  },
  shot: {
    width: 152,
    height: 112,
    marginLeft: -36,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    cursor: "pointer",
  },
  shotFirst: {
    marginLeft: 0,
  },
  shotFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  shotCaption: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(18, 24, 38, 0.78)",
  },
  shotCaptionText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    color: "#FFFFFF",
  },
  emptyHint: {
    lineHeight: 21,
    maxWidth: 420,
  },
  trioWrap: {
    width: "100%",
  },
  trio: {
    width: "100%",
  },
  trioSplit: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  trioStacked: {
    flexDirection: "column",
  },
  col: {
    flex: 1,
    minWidth: 0,
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 28,
    cursor: "pointer",
  },
  colStatic: {
    flex: 1,
    minWidth: 0,
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 28,
  },
  colRuleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  colCompact: {
    paddingHorizontal: 16,
  },
  colHover: {
    backgroundColor: "rgba(47, 111, 237, 0.04)",
  },
  colTitle: {
    fontSize: 17,
    lineHeight: 24,
    marginTop: 2,
  },
  colBody: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 280,
  },
  signOut: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  signOutHover: {
    opacity: 0.72,
  },
  signOutText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.danger,
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
    maxWidth: 480,
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
    paddingVertical: 16,
    paddingBottom: 28,
  },
  dialogBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
