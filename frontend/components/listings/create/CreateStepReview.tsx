import axios from "axios";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { amenityLabel, highlightLabel } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCredits } from "@/features/credits/useCredits";
import { mapDraftToBody } from "@/features/listings/create/mapDraftToBody";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { useCreateListing } from "@/features/listings/useCreateListing";
import { useMyListings } from "@/features/listings/useMyListings";
import { formatFreshUsd } from "@/lib/format";
import { labelListingType } from "@/lib/listingLabels";
import { deriveListingType } from "@/features/listings/create/deriveListingType";
import { wizardPublishIssues } from "@/features/listings/create/validators";

export function CreateStepReview() {
  const { draft, reset, setStep } = useCreateListingDraft();
  const { refreshUser } = useAuthSession();
  const create = useCreateListing();
  const credits = useCredits();
  const mine = useMyListings();
  const [published, setPublished] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeCount = (mine.data ?? []).filter((l) => l.status === "active").length;
  const postCredits = credits.data?.postCredits ?? 0;
  const needsCredit = activeCount > 0;
  const canAfford = !needsCredit || postCredits >= 1;
  const listingType =
    draft.spaceType && draft.propertyType
      ? deriveListingType(draft.spaceType, draft.propertyType)
      : null;

  const previewTitle = draft.title.trim() || "Untitled listing";
  const cover = draft.photos.find((p) => p.status === "ready")?.uri;

  const costLine = useMemo(() => {
    if (!needsCredit) return "First live listing this month is free.";
    return "Publishing this extra listing costs 1 post credit.";
  }, [needsCredit]);

  const publishIssues = useMemo(() => wizardPublishIssues(draft), [draft]);
  const canPublish = canAfford && publishIssues.length === 0;

  function publish() {
    setErr(null);
    if (publishIssues.length > 0) {
      const lines = publishIssues.flatMap((issue) =>
        issue.messages.map((msg) => `• ${issue.stepTitle}: ${msg}`),
      );
      setErr(`Complete these before publishing:\n${lines.join("\n")}`);
      return;
    }
    if (!canAfford) {
      setErr("Buy a post credit to publish another live listing.");
      return;
    }
    create.mutate(mapDraftToBody(draft), {
      onSuccess: async (listing) => {
        await refreshUser();
        setPublished(true);
        reset();
        setTimeout(() => {
          router.replace({
            pathname: "/(poster)/listing/[id]",
            params: { id: listing.id },
          });
        }, 400);
      },
      onError: (error) => {
        if (axios.isAxiosError(error)) {
          const code = error.response?.data?.error?.code;
          const message = error.response?.data?.error?.message;
          if (code === "INSUFFICIENT_CREDITS") {
            setErr(message ?? "A post credit is required.");
            return;
          }
          setErr(message ?? "Could not publish. Check the form and try again.");
          return;
        }
        setErr(error instanceof Error ? error.message : "Publish failed.");
      },
    });
  }

  return (
    <View style={{ gap: 16 }}>
      <Enter>
        <View style={styles.preview}>
          <LText variant="label" tone="primary">
            Renter preview
          </LText>
          <LText variant="title">{previewTitle}</LText>
          <LText variant="caption" tone="muted">
            {draft.area}
            {listingType ? ` · ${labelListingType(listingType)}` : ""}
            {cover ? " · cover ready" : ""}
          </LText>
          <LText variant="subtitle" tone="primary">
            {draft.monthlyRentUsd
              ? formatFreshUsd(Number(draft.monthlyRentUsd) || 0)
              : "—"}
            /mo
          </LText>
          {draft.highlightTags.length > 0 ? (
            <LText variant="caption" tone="muted">
              {draft.highlightTags.map(highlightLabel).join(" · ")}
            </LText>
          ) : null}
          {draft.amenities.length > 0 ? (
            <LText variant="caption" tone="muted">
              {draft.amenities.slice(0, 4).map(amenityLabel).join(" · ")}
            </LText>
          ) : null}
        </View>
      </Enter>
      <Enter delay={80}>
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
          loading={create.isPending}
          disabled={!canPublish || create.isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: 6,
    padding: 16,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
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
  issueBlock: {
    gap: 2,
  },
  issueStep: {
    fontFamily: Lister.type.bodySemi,
  },
  errText: {
    lineHeight: 20,
  },
});
