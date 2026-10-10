import { usePromotionOptions } from "@/features/promotions/usePromotions";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text } from "react-native";
import { HostAnalyticsGlassPane } from "@/components/web/host/analytics/HostAnalyticsStatCard";
import {
  type HostEditSection,
} from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";
import { openListingEdit } from "@/features/listings/edit/openListingEdit";
import {
  dismissSilenceTip,
  dismissedSilenceAction,
  silenceDiagnosis,
  silenceEditSection,
  SILENCE_COPY,
  type SilenceAction,
} from "@/features/listings/silenceDiagnosis";
import { usePriceGuideState } from "@/features/listings/usePriceGuide";
import type { Listing } from "@/types/listing";

type Props = {
  live: boolean;
  viewCount: number;
  leadCount: number;
  place: Listing | null;
};

const EMPTY_COMP = {
  area: "",
  spaceType: "entire_place" as const,
  propertyType: "apartment" as const,
  bedrooms: 0,
  priceBasis: "per_unit_month" as const,
};

function compDraft(place: Listing) {
  const bedrooms = place.bedrooms;
  if (
    !place.area ||
    !place.spaceType ||
    !place.propertyType ||
    !place.priceBasis ||
    bedrooms == null ||
    !Number.isInteger(bedrooms)
  ) {
    return null;
  }
  return {
    area: place.area,
    spaceType: place.spaceType,
    propertyType: place.propertyType,
    bedrooms,
    priceBasis: place.priceBasis,
  };
}

function hasPin(place: Listing): boolean {
  return (
    place.lat != null &&
    place.lng != null &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  );
}

function isBoosted(until: string | null): boolean {
  if (!until) return false;
  const time = new Date(until).getTime();
  return Number.isFinite(time) && time > Date.now();
}

export function SilenceNextStep({ live, viewCount, leadCount, place }: Props) {
  const router = useRouter();
  const promotion = usePromotionOptions(place?.id ?? "", !!place && live && viewCount > 0 && leadCount === 0);
  const [dismissed, setDismissed] = useState<SilenceAction | null>(null);
  useEffect(() => {
    if (!place) return;
    setDismissed(dismissedSilenceAction(place.id));
  }, [place]);
  const [copied, setCopied] = useState(false);
  const draft = place ? compDraft(place) : null;
  const photoCount = place?.photos?.length ?? 0;
  const needsComps =
    place != null && live && leadCount <= 0 && viewCount > 0 && photoCount >= 3 && draft != null;
  const comps = usePriceGuideState(draft ?? EMPTY_COMP, {
    excludeListingId: place?.id,
    enabled: needsComps,
  });

  if (!place) return null;

  const action = silenceDiagnosis({
    live,
    viewCount,
    leadCount,
    photoCount,
    hasPin: hasPin(place),
    rentUsd: Number.isFinite(place.monthlyRentUsd) ? place.monthlyRentUsd : null,
    compHighUsd: comps.guide?.highUsd ?? null,
    compsReady: !needsComps || comps.ready,
    boosted: !!promotion.data?.currentCampaign || isBoosted(place.boostedUntil),
    boostSpendAvailable: !!promotion.data?.eligible,
  });

  if (!action || dismissed === action) return null;

  const copy = SILENCE_COPY[action];
  const section = silenceEditSection(action, { photoCount });

  function openEdit(next: HostEditSection) {
    openListingEdit(router, place!.id, next);
  }

  function openBoost() {
    router.push({ pathname: '/hosting/listing/[id]/promote', params: { id: place!.id, product: 'bump_3' } } as never);
  }

  async function shareListing() {
    const path = `/listing/${place!.id}`;
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(url);
        setCopied(true);
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      // The host dismissed the share sheet.
    }
  }

  function onPress() {
    if (section) {
      openEdit(section);
      return;
    }
    if (action === "boost") {
      openBoost();
      return;
    }
    if (action === "share") {
      void shareListing();
      return;
    }
    dismissSilenceTip(place!.id, action);
    setDismissed(action);
  }

  const cta = action === "share" && copied ? "link copied" : copy.cta;

  return (
    <HostAnalyticsGlassPane style={styles.pane} contentStyle={styles.inner}>
      <Text style={styles.kicker}>next step</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{cta}</Text>
      </Pressable>
      {action === 'boost' && <Pressable accessibilityRole="button" onPress={() => openEdit('photos')} style={styles.button}><Text style={styles.buttonText}>Review listing photos</Text></Pressable>}
    </HostAnalyticsGlassPane>
  );
}

const web = Platform.OS === "web";

const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  inner: {
    gap: 6,
  },
  kicker: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    color: "#8B95A1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: Skoun.color.ink,
  },
  body: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 6,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
