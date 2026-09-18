import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
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

      <Enter delay={140}>
        <View style={styles.credit}>
          <LText variant="subtitle">Credits</LText>
          <LText variant="body" tone="muted">
            Balance: {postCredits} post credit{postCredits === 1 ? "" : "s"}
          </LText>
          <LText variant="caption" tone={canAfford ? "muted" : "danger"}>
            {costLine}
          </LText>
          {!canAfford ? (
            <LButton
              label="Buy credits"
              variant="secondary"
              onPress={() => router.push("/(poster)/(tabs)/credits" as never)}
            />
          ) : null}
        </View>
      </Enter>

      {err ? (
        <LText variant="caption" tone="danger" style={styles.errText}>
          {err}
        </LText>
      ) : null}
      {publishIssues.length > 0 ? (
        <View style={styles.issuesBox}>
          <LText variant="subtitle">Still needed</LText>
          {publishIssues.map((issue) => (
            <View key={issue.step} style={styles.issueBlock}>
              <LText variant="caption" tone="primary" style={styles.issueStep}>
                {issue.stepTitle}
              </LText>
              {issue.messages.map((msg) => (
                <LText key={msg} variant="caption" tone="muted">
                  • {msg}
                </LText>
              ))}
            </View>
          ))}
          <LButton
            label="Go to first step to fix"
            variant="secondary"
            onPress={() => setStep(publishIssues[0].step)}
          />
        </View>
      ) : null}
      {published ? (
        <LText variant="subtitle">Listing published successfully!</LText>
      ) : (
        <LButton
          label="Publish listing"
          onPress={publish}
          loading={createPending}
          disabled={!canPublish || createPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 28 },
  credit: {
    gap: 6,
    padding: 16,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1,
    borderColor: Lister.color.primarySoft,
  },
  issuesBox: {
    gap: 10,
    padding: 16,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.dangerSoft,
    borderWidth: 1,
    borderColor: Lister.color.danger,
  },
  issueBlock: { gap: 2 },
  issueStep: { fontFamily: Lister.type.bodySemi },
  errText: { lineHeight: 20 },
});
