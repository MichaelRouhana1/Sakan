import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { CardBadgeEditor } from "@/components/listings/create/CardBadgeEditor";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { previewListingFromDraft } from "@/features/listings/create/previewListingFromDraft";
import { usePublishListingDraft } from "@/features/listings/create/usePublishListingDraft";
import { draftCardBadgeKeys, sameBadgeKeys } from "@/lib/listingCardBadges";

export function CreateStepReview() {
  const { draft, patch } = useCreateListingDraft();

  const listing = useMemo(() => {
    const preview = previewListingFromDraft(draft);
    return { ...preview, cardBadges: draftCardBadgeKeys(preview) };
  }, [draft]);

  useEffect(() => {
    if (draft.cardBadges == null || !sameBadgeKeys(listing.cardBadges, draft.cardBadges)) {
      patch({ cardBadges: listing.cardBadges });
    }
  }, [draft.cardBadges, listing.cardBadges, patch]);

  return (
    <View style={styles.root}>
      <CardBadgeEditor listing={listing} onChange={(cardBadges) => patch({ cardBadges })} />
    </View>
  );
}

export function CreateStepReviewFooter() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const {
    publish,
    canPublish,
    canAfford,
    postCredits,
    costLine,
    publishIssues,
    err,
    published,
    createPending,
    setStep,
  } = usePublishListingDraft();
  const missingCount = publishIssues.reduce((total, issue) => total + issue.messages.length, 0);

  return (
    <View style={styles.footerContent}>
      {err ? <LText variant="caption" tone="danger" style={styles.footerMessage}>{err}</LText> : null}
      {publishIssues.length > 0 ? (
        <View style={styles.footerIssueRow}>
          <LText variant="caption" tone="danger" style={styles.footerMessage}>
            {missingCount} required {missingCount === 1 ? "item is" : "items are"} still missing.
          </LText>
          <LButton label="Review missing details" variant="secondary" onPress={() => setStep(publishIssues[0].step)} />
        </View>
      ) : null}
      <View style={[styles.footerActions, compact && styles.footerActionsCompact]}>
        <View style={[styles.creditSummary, compact && styles.creditSummaryCompact]}>
          <View style={styles.creditCopy}>
            <LText variant="subtitle">
              {compact ? `${postCredits} credit${postCredits === 1 ? "" : "s"}` : `Credits · ${postCredits} available`}
            </LText>
            {!compact ? <LText variant="caption" tone={canAfford ? "muted" : "danger"} style={styles.creditCost}>{costLine}</LText> : null}
          </View>
          {!canAfford ? (
            <Pressable accessibilityRole="button" onPress={() => router.push("/(poster)/(tabs)/credits" as never)} style={styles.buyCredits}>
              <LText variant="caption" tone="primary">Buy</LText>
            </Pressable>
          ) : null}
        </View>
        {published ? (
          <View style={styles.published}>
            <Ionicons name="checkmark-circle" size={20} color={Lister.color.primary} />
            <LText variant="subtitle">Listing published</LText>
          </View>
        ) : (
          <LButton
            label="Publish listing"
            onPress={publish}
            loading={createPending}
            disabled={!canPublish || createPending}
            style={[styles.publishButton, compact && styles.publishButtonCompact]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  footerContent: { gap: 8 },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  footerActionsCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creditSummary: {
    flexBasis: 380,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 400,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1,
    borderColor: Lister.color.primarySoft,
  },
  creditSummaryCompact: {
    flexBasis: 104,
    maxWidth: 112,
    paddingHorizontal: 10,
  },
  creditCopy: { flex: 1, minWidth: 0, gap: 1 },
  creditCost: { fontSize: 12, lineHeight: 16 },
  buyCredits: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  publishButton: { minWidth: 176, paddingHorizontal: 24 },
  publishButtonCompact: { minWidth: 132, paddingHorizontal: 12 },
  footerIssueRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  footerMessage: { textAlign: "right", lineHeight: 18 },
  published: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 },
});
