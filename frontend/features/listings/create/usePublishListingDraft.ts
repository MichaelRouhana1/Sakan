import axios from "axios";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCredits } from "@/features/credits/useCredits";
import { mapDraftToBody } from "@/features/listings/create/mapDraftToBody";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { wizardPublishIssues } from "@/features/listings/create/validators";
import { useCreateListing } from "@/features/listings/useCreateListing";
import { useMyListings } from "@/features/listings/useMyListings";

export function usePublishListingDraft() {
  const { draft, reset, setStep } = useCreateListingDraft();
  const { refreshUser } = useAuthSession();
  const create = useCreateListing();
  const credits = useCredits();
  const mine = useMyListings();
  const [published, setPublished] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeCount = (mine.data ?? []).filter((l) => l.status === "active")
    .length;
  const postCredits = credits.data?.postCredits ?? 0;
  const needsCredit = activeCount > 0;
  const canAfford = !needsCredit || postCredits >= 1;

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
        await reset();
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

  return {
    publish,
    canPublish,
    canAfford,
    needsCredit,
    postCredits,
    costLine,
    publishIssues,
    err,
    published,
    createPending: create.isPending,
    setStep,
  };
}
