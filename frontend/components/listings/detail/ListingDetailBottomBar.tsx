import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LText } from "@/components/lister/Typography";
import { listingMoveInRows } from "@/components/listings/detail/listingMoveIn";
import { Studently } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { rentPriceType } from "@/lib/rentPriceType";
import { studentlyShadow } from "@/lib/studentlyShadow";
import {
  WHATSAPP_GREEN,
  hasUsableWhatsAppPhone,
  listingAllowsWhatsApp,
} from "@/lib/whatsapp";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  posterPhone: string | null;
  onWhatsApp: () => void;
};

function triggerTapHaptic() {
  if (Platform.OS === "web") return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  } catch {
    // Ignore on platforms without haptics.
  }
}

function footerSubtitle(listing: Listing): {
  text: string;
  tone: "muted" | "warning";
} {
  if (listing.availability === "rented") {
    return { text: "Currently rented", tone: "muted" };
  }
  if (listing.availability === "pending") {
    return { text: "Under offer", tone: "warning" };
  }
  if (listing.placeContext?.isMultiUnit) {
    const unit =
      listing.unitType === "shared_bed"
        ? "Per bed"
        : listing.unitType === "private_room"
          ? "Per room"
          : "Per apartment";
    return { text: unit, tone: "muted" };
  }
  const firstRow = listingMoveInRows(listing)[0];
  if (firstRow) {
    return { text: `${firstRow.label} ${firstRow.value}`, tone: "muted" };
  }
  return { text: "No booking fee", tone: "muted" };
}

export function ListingDetailBottomBar({
  listing,
  posterPhone,
  onWhatsApp,
}: Props) {
  const insets = useSafeAreaInsets();
  const whatsAppOpen = listingAllowsWhatsApp(listing.availability);
  const canContact = whatsAppOpen && hasUsableWhatsAppPhone(posterPhone);
  const callPhone = listing.contactPhone ?? null;
  const canCall = Boolean(
    whatsAppOpen && callPhone && callPhone.replace(/\D/g, "").length >= 8,
  );
  const subtitle = footerSubtitle(listing);

  const handleWhatsApp = () => {
    triggerTapHaptic();
    onWhatsApp();
  };

  const openCall = () => {
    if (!callPhone || !canCall) return;
    triggerTapHaptic();
    void Linking.openURL(`tel:${callPhone}`);
  };

  return (
    <View
      testID="listing-detail-bottom-bar"
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.priceCol}>
        <View style={styles.priceRow}>
          <LText
            variant="body"
            style={[rentPriceType, styles.priceAmount]}
            numberOfLines={1}
          >
            {formatFreshUsd(listing.monthlyRentUsd)}
          </LText>
          <LText variant="caption" style={styles.priceUnit} numberOfLines={1}>
            / mo
          </LText>
        </View>
        <LText
          variant="caption"
          numberOfLines={1}
          style={[
            styles.priceSub,
            subtitle.tone === "warning" && styles.priceSubWarning,
          ]}
        >
          {subtitle.text}
        </LText>
      </View>

      <View style={styles.actions}>
        {canCall ? (
          <Pressable
            testID="listing-footer-call"
            accessibilityRole="button"
            accessibilityLabel="Call listing"
            hitSlop={4}
            onPress={openCall}
            style={({ pressed }) => [
              styles.btn,
              canContact ? styles.callSecondary : styles.callSoloPrimary,
              pressed &&
                (canContact
                  ? styles.callSecondaryPressed
                  : styles.callSoloPrimaryPressed),
            ]}
          >
            <Ionicons
              name="call-outline"
              size={16}
              color={canContact ? Studently.color.ink : Studently.color.surface}
            />
            <LText
              variant="caption"
              style={
                canContact ? styles.secondaryLabel : styles.primaryLabel
              }
              numberOfLines={1}
            >
              Call
            </LText>
          </Pressable>
        ) : null}

        {canContact ? (
          <Pressable
            testID="listing-footer-whatsapp"
            accessibilityRole="button"
            accessibilityLabel="Contact on WhatsApp"
            hitSlop={4}
            onPress={handleWhatsApp}
            style={({ pressed }) => [
              styles.btn,
              styles.whatsappPrimary,
              !canCall && styles.soloPad,
              pressed && styles.whatsappPrimaryPressed,
            ]}
          >
            <Ionicons
              name="logo-whatsapp"
              size={17}
              color={WHATSAPP_GREEN}
            />
            <LText
              variant="caption"
              style={styles.primaryLabel}
              numberOfLines={1}
            >
              WhatsApp
            </LText>
          </Pressable>
        ) : null}

        {!canContact && !canCall ? (
          <View
            accessibilityRole="text"
            accessibilityLabel={
              whatsAppOpen ? "WhatsApp contact soon" : "Listing rented"
            }
            style={[styles.btn, styles.disabledPill]}
          >
            <LText
              variant="caption"
              style={styles.disabledLabel}
              numberOfLines={1}
            >
              {whatsAppOpen ? "WhatsApp soon" : "Rented"}
            </LText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const BAR_SHADOW = studentlyShadow({
  color: "#1A1A1A",
  y: -3,
  blur: 14,
  opacity: 0.06,
  elevation: 8,
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 11,
    backgroundColor: Studently.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Studently.color.border,
    ...BAR_SHADOW,
  },
  priceCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  priceAmount: {
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.35,
    color: Studently.color.ink,
  },
  priceUnit: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: Studently.type.bodyMedium,
    color: Studently.color.inkMuted,
  },
  priceSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Studently.type.bodyMedium,
    color: Studently.color.inkMuted,
  },
  priceSubWarning: {
    color: Studently.color.warning,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  btn: {
    height: 44,
    borderRadius: Studently.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  callSecondary: {
    paddingHorizontal: 14,
    backgroundColor: Studently.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  callSecondaryPressed: {
    backgroundColor: Studently.color.bgWash,
    transform: [{ scale: 0.97 }],
  },
  callSoloPrimary: {
    paddingHorizontal: 20,
    backgroundColor: Studently.color.primary,
  },
  callSoloPrimaryPressed: {
    backgroundColor: Studently.color.primaryPressed,
    transform: [{ scale: 0.97 }],
  },
  whatsappPrimary: {
    paddingHorizontal: 16,
    backgroundColor: Studently.color.ink,
  },
  whatsappPrimaryPressed: {
    backgroundColor: "#2E2E2E",
    transform: [{ scale: 0.97 }],
  },
  soloPad: {
    paddingHorizontal: 20,
  },
  primaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Studently.type.bodySemi,
    color: Studently.color.surface,
  },
  secondaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Studently.type.bodySemi,
    color: Studently.color.ink,
  },
  disabledPill: {
    paddingHorizontal: 14,
    backgroundColor: Studently.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Studently.color.border,
    ...(Platform.OS === "web" ? ({ cursor: "default" } as object) : null),
  },
  disabledLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: Studently.type.bodyMedium,
    color: Studently.color.inkMuted,
  },
});
