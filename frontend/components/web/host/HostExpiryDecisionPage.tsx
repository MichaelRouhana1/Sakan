import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HostNotificationPreferences } from "@/components/web/host/HostNotificationPreferences";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";
import {
  useExpiryDecision,
  useRenewListing,
  useSubmitExpiryDecision,
  type ExpiryDecision,
} from "@/features/listings/useExpiryDecision";
import { useBreakpoint } from "@/lib/breakpoints";
import { formatFreshUsd } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export function HostExpiryDecisionPage({ listingId }: { listingId: string }) {
  const router = useRouter();
  const compact = useBreakpoint() !== "desktop" || Platform.OS !== "web";
  const query = useExpiryDecision(listingId);
  const decide = useSubmitExpiryDecision(listingId);
  const renew = useRenewListing(listingId);
  const [showImprove, setShowImprove] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsCredit, setNeedsCredit] = useState(false);
  const [renewedNow, setRenewedNow] = useState(false);

  if (query.isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Skoun.color.primary} /></View>;
  }
  if (!query.data || query.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>This listing isn’t available here</Text>
        <Text style={styles.errorBody}>Only the listing owner can open its expiry decision.</Text>
        <ActionButton label="Back to listings" onPress={() => router.replace(HOST_LISTINGS_PATH as never)} />
      </View>
    );
  }

  const data = query.data;
  const finalOutcome = data.outcome && data.outcome !== "unknown" ? data.outcome : null;
  const liveAhead = data.listing.status === "active" &&
    new Date(data.cycleExpiresAt).getTime() > Date.now() + 5 * 24 * 60 * 60 * 1000;
  const approachingExpiry = data.listing.status === "active" &&
    new Date(data.cycleExpiresAt).getTime() > Date.now() && !liveAhead;
  const resolvedOutcome = renewedNow ? "renewed" : finalOutcome;
  const cover = resolveMediaUrl(data.listing.coverUrl ?? data.listing.photos[0]?.url ?? null);
  const busy = decide.isPending || renew.isPending;

  async function doRenew() {
    setNotice(null);
    setNeedsCredit(false);
    try {
      await decide.mutateAsync({
        cycleExpiresAt: data.cycleExpiresAt,
        decision: "still_available",
      });
      await renew.mutateAsync(data.cycleExpiresAt);
      setRenewedNow(true);
      setNotice("Renewed for 30 more days.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        setNeedsCredit(true);
        setNotice("One post credit is needed to complete this renewal.");
        return;
      }
      setNotice("Couldn’t renew this listing. Please try again.");
    }
  }

  async function choose(decision: ExpiryDecision) {
    setNotice(null);
    if (decision === "still_available") {
      await doRenew();
      return;
    }
    try {
      await decide.mutateAsync({ cycleExpiresAt: data.cycleExpiresAt, decision });
      if (decision === "improve") {
        setShowImprove(true);
      } else {
        setNotice(decision === "rented" ? "Thanks — marked as rented." : "Listing taken down.");
      }
    } catch {
      setNotice("Couldn’t save that decision. Please try again.");
    }
  }

  const returnTo = `/hosting/listing/${listingId}/outcome`;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.page, compact && styles.pageCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to listings"
          onPress={() => router.replace(HOST_LISTINGS_PATH as never)}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={18} color={Skoun.color.ink} />
          <Text style={styles.backText}>Your listings</Text>
        </Pressable>

        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={[styles.media, compact && styles.mediaCompact]}>
            {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
              <View style={styles.placeholder}><Ionicons name="image-outline" size={32} color={Skoun.color.inkFaint} /></View>
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{data.listing.status === "archived" ? "Off browse" : approachingExpiry ? "Expires soon" : "Expiry check-in"}</Text>
            <Text style={styles.headline}>{resolvedOutcome ? outcomeTitle(resolvedOutcome) : liveAhead ? "Listing is live" : approachingExpiry ? "Still available?" : "Was it rented?"}</Text>
            <Text style={styles.lede}>
              {resolvedOutcome
                ? "This listing cycle is resolved. Its history stays saved for you and the Skoun team."
                : liveAhead
                  ? `This listing is active until ${new Date(data.cycleExpiresAt).toLocaleDateString()}. Come back near expiry to review it.`
                : approachingExpiry
                  ? `It expires ${new Date(data.cycleExpiresAt).toLocaleDateString()}. Renew it now or tell us what changed.`
                : "Tell us what happened. Your answer helps keep listings accurate and never triggers an automatic financial action."}
            </Text>
            <View style={styles.listingMeta}>
              <Text style={styles.listingTitle} numberOfLines={2}>{data.listing.title || data.listing.area}</Text>
              <Text style={styles.listingSub}>{data.listing.area} · {formatFreshUsd(data.listing.monthlyRentUsd)}</Text>
            </View>
          </View>
        </View>

        {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}

        {resolvedOutcome || liveAhead ? (
          <View style={styles.resolvedCard}>
            <Ionicons name="checkmark-circle" size={28} color={Skoun.color.primary} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{resolvedOutcome ? outcomeTitle(resolvedOutcome) : "Listing is live"}</Text>
              <Text style={styles.cardBody}>
                {resolvedOutcome
                  ? `Recorded ${data.outcomeAt ? new Date(data.outcomeAt).toLocaleDateString() : "for this cycle"}.`
                  : `Expires ${new Date(data.cycleExpiresAt).toLocaleDateString()}.`}
              </Text>
            </View>
            <ActionButton label="Back to listings" onPress={() => router.replace(HOST_LISTINGS_PATH as never)} small />
          </View>
        ) : (
          <View style={[styles.contentGrid, compact && styles.contentGridCompact]}>
            <View style={styles.actionsCard}>
              <Text style={styles.sectionTitle}>{approachingExpiry ? "Choose what to do" : "Choose what happened"}</Text>
              <Text style={styles.sectionBody}>{approachingExpiry ? "Renew before expiry to keep the listing live." : "The listing is hidden at expiry until you renew it."}</Text>
              <View style={styles.actionStack}>
                {data.recommendImprove ? (
                  <DecisionButton icon="construct-outline" label="Improve then renew" detail="Review photos, price, contact and details" primary onPress={() => void choose("improve")} disabled={busy} />
                ) : (
                  <DecisionButton icon="refresh" label="Still available — Renew" detail="Uses 1 post credit for 30 more days" primary onPress={() => void choose("still_available")} disabled={busy} />
                )}
                <DecisionButton icon="key-outline" label="Rented" detail="Mark the result and keep it off browse" onPress={() => void choose("rented")} disabled={busy} />
                {data.recommendImprove ? (
                  <DecisionButton icon="refresh" label="Renew without changes" detail="Uses 1 post credit for 30 more days" onPress={() => void choose("still_available")} disabled={busy} />
                ) : (
                  <DecisionButton icon="construct-outline" label="Review improvements first" detail="See a quick listing health checklist" onPress={() => void choose("improve")} disabled={busy} />
                )}
                <DecisionButton icon="archive-outline" label="Archive / take down" detail="Keep the listing saved but hidden" quiet onPress={() => void choose("archive")} disabled={busy} />
              </View>
              {busy ? <ActivityIndicator color={Skoun.color.primary} style={styles.busy} /> : null}
              {needsCredit ? (
                <ActionButton
                  label="Get a post credit"
                  onPress={() => router.push({ pathname: "/hosting/credits", params: { returnTo } } as never)}
                />
              ) : null}
            </View>

            <View style={styles.checklistCard}>
              <View style={styles.checklistHeading}>
                <Text style={styles.sectionTitle}>Listing health</Text>
                <View style={styles.scorePill}><Text style={styles.scoreText}>{data.checklist.filter((item) => item.complete).length}/{data.checklist.length} ready</Text></View>
              </View>
              {data.checklist.map((item) => (
                <View key={item.id} style={styles.checkRow}>
                  <Ionicons name={item.complete ? "checkmark-circle" : "alert-circle-outline"} size={20} color={item.complete ? Skoun.color.primary : Skoun.color.warning} />
                  <Text style={styles.checkText}>{item.label}</Text>
                </View>
              ))}
              {(showImprove || data.intent === "improve") ? (
                <View style={styles.editNote}>
                  <Text style={styles.editNoteTitle}>Editing tools are not available from this screen yet.</Text>
                  <Text style={styles.editNoteBody}>Use this checklist before renewing. Your improvement intent has been saved for follow-up.</Text>
                </View>
              ) : null}
              {data.priceGuide ? (
                <Text style={styles.priceGuide}>Based on {data.priceGuide.n} comparable live listings · median {formatFreshUsd(data.priceGuide.medianUsd)}</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.preferences}><HostNotificationPreferences compact={compact} /></View>
      </View>
    </ScrollView>
  );
}

function outcomeTitle(outcome: "rented" | "renewed" | "archived") {
  if (outcome === "rented") return "Marked as rented";
  if (outcome === "renewed") return "Listing renewed";
  return "Listing archived";
}

function DecisionButton(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  primary?: boolean;
  quiet?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.label}. ${props.detail}`}
      disabled={props.disabled}
      onPress={props.onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.decision, props.primary && styles.decisionPrimary, props.quiet && styles.decisionQuiet, focused && styles.focusRing, pressed && styles.pressed, props.disabled && styles.disabled]}
    >
      <View style={[styles.decisionIcon, props.primary && styles.decisionIconPrimary]}><Ionicons name={props.icon} size={20} color={props.primary ? "#FFFFFF" : Skoun.color.primary} /></View>
      <View style={styles.flex}><Text style={[styles.decisionLabel, props.primary && styles.decisionLabelPrimary]}>{props.label}</Text><Text style={[styles.decisionDetail, props.primary && styles.decisionDetailPrimary]}>{props.detail}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={props.primary ? "#FFFFFF" : Skoun.color.inkMuted} />
    </Pressable>
  );
}

function ActionButton({ label, onPress, small = false }: { label: string; onPress: () => void; small?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.button, small && styles.buttonSmall, focused && styles.focusRing, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: Skoun.color.bg, paddingBottom: 56 },
  page: { width: "100%", maxWidth: 1100, alignSelf: "center", paddingHorizontal: 36, paddingTop: 28 },
  pageCompact: { paddingHorizontal: 18, paddingTop: 18 },
  center: { flex: 1, minHeight: 420, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: Skoun.color.bg },
  errorTitle: { fontFamily: Skoun.type.bodyBold, fontSize: 22, color: Skoun.color.ink, textAlign: "center" },
  errorBody: { fontFamily: Skoun.type.body, fontSize: 15, color: Skoun.color.inkMuted, textAlign: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 8, marginBottom: 18, cursor: "pointer" },
  backText: { fontFamily: Skoun.type.bodySemi, fontSize: 14, color: Skoun.color.ink },
  hero: { flexDirection: "row", gap: 28, alignItems: "stretch", padding: 22, borderRadius: 24, backgroundColor: Skoun.color.primaryDeep, overflow: "hidden" },
  heroCompact: { flexDirection: "column", padding: 16, gap: 18 },
  media: { width: 280, minHeight: 210, borderRadius: 17, overflow: "hidden", backgroundColor: Skoun.color.bgWash },
  mediaCompact: { width: "100%", minHeight: 200 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, justifyContent: "center", gap: 8 },
  eyebrow: { fontFamily: Skoun.type.bodyBold, fontSize: 11, letterSpacing: 1.7, textTransform: "uppercase", color: Skoun.color.primarySoft },
  headline: { fontFamily: Skoun.type.displaySerif, fontSize: 38, lineHeight: 44, color: "#FFFFFF" },
  lede: { fontFamily: Skoun.type.body, fontSize: 15, lineHeight: 22, color: "#D7DEE9", maxWidth: 560 },
  listingMeta: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.16)", gap: 3 },
  listingTitle: { fontFamily: Skoun.type.bodySemi, fontSize: 15, color: "#FFFFFF" },
  listingSub: { fontFamily: Skoun.type.body, fontSize: 13, color: "#C5CDD8" },
  notice: { marginTop: 16, borderRadius: 12, backgroundColor: Skoun.color.primaryMist, padding: 13 },
  noticeText: { fontFamily: Skoun.type.bodyMedium, fontSize: 14, color: Skoun.color.ink },
  contentGrid: { flexDirection: "row", gap: 20, alignItems: "flex-start", marginTop: 22 },
  contentGridCompact: { flexDirection: "column" },
  actionsCard: { flex: 1.1, width: "100%", borderRadius: 20, borderWidth: 1, borderColor: Skoun.color.border, backgroundColor: Skoun.color.surface, padding: 20 },
  checklistCard: { flex: 0.9, width: "100%", borderRadius: 20, borderWidth: 1, borderColor: Skoun.color.border, backgroundColor: Skoun.color.surface, padding: 20, gap: 13 },
  sectionTitle: { fontFamily: Skoun.type.bodyBold, fontSize: 19, color: Skoun.color.ink },
  sectionBody: { fontFamily: Skoun.type.body, fontSize: 14, lineHeight: 20, color: Skoun.color.inkMuted, marginTop: 4 },
  actionStack: { gap: 10, marginTop: 18 },
  decision: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: Skoun.color.border, backgroundColor: Skoun.color.surfaceMuted, cursor: "pointer" },
  decisionPrimary: { backgroundColor: Skoun.color.primary, borderColor: Skoun.color.primary },
  decisionQuiet: { backgroundColor: "transparent", borderColor: "transparent" },
  decisionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Skoun.color.primaryMist },
  decisionIconPrimary: { backgroundColor: "rgba(255,255,255,0.17)" },
  decisionLabel: { fontFamily: Skoun.type.bodySemi, fontSize: 15, color: Skoun.color.ink },
  decisionLabelPrimary: { color: "#FFFFFF" },
  decisionDetail: { fontFamily: Skoun.type.body, fontSize: 12, lineHeight: 17, color: Skoun.color.inkMuted, marginTop: 2 },
  decisionDetailPrimary: { color: "#E8EEF6" },
  flex: { flex: 1 },
  pressed: { opacity: 0.82 },
  focusRing: { outlineWidth: 3, outlineColor: Skoun.color.primarySoft, outlineOffset: 2 },
  disabled: { opacity: 0.55 },
  busy: { marginTop: 14 },
  checklistHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  scorePill: { borderRadius: 999, backgroundColor: Skoun.color.primaryMist, paddingHorizontal: 10, paddingVertical: 5 },
  scoreText: { fontFamily: Skoun.type.bodySemi, fontSize: 11, color: Skoun.color.primaryDeep },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkText: { flex: 1, fontFamily: Skoun.type.bodyMedium, fontSize: 14, lineHeight: 20, color: Skoun.color.ink },
  editNote: { marginTop: 4, borderRadius: 12, backgroundColor: Skoun.color.warningSoft, padding: 12, gap: 4 },
  editNoteTitle: { fontFamily: Skoun.type.bodySemi, fontSize: 13, color: Skoun.color.ink },
  editNoteBody: { fontFamily: Skoun.type.body, fontSize: 12, lineHeight: 17, color: Skoun.color.inkMuted },
  priceGuide: { fontFamily: Skoun.type.body, fontSize: 12, lineHeight: 17, color: Skoun.color.inkMuted },
  resolvedCard: { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, borderColor: Skoun.color.border, backgroundColor: Skoun.color.surface, padding: 18 },
  cardTitle: { fontFamily: Skoun.type.bodyBold, fontSize: 16, color: Skoun.color.ink },
  cardBody: { fontFamily: Skoun.type.body, fontSize: 13, color: Skoun.color.inkMuted, marginTop: 2 },
  button: { alignSelf: "flex-start", marginTop: 14, borderRadius: 10, backgroundColor: Skoun.color.primary, paddingHorizontal: 18, paddingVertical: 12, cursor: "pointer" },
  buttonSmall: { marginTop: 0, paddingVertical: 9, paddingHorizontal: 13 },
  buttonText: { fontFamily: Skoun.type.bodySemi, fontSize: 14, color: "#FFFFFF" },
  preferences: { marginTop: 24 },
});
