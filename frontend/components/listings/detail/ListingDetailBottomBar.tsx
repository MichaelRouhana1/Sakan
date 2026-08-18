import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { labelListingType } from "@/lib/listingLabels";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  posterPhone: string | null;
  reported: boolean;
  onReport: () => void;
};

export function ListingDetailBottomBar({
  listing,
  posterPhone,
  reported,
  onReport,
}: Props) {
  const insets = useSafeAreaInsets();
  const canContact = hasUsableWhatsAppPhone(posterPhone);
  const callPhone = listing.contactPhone ?? null;
  const canCall = Boolean(callPhone && callPhone.replace(/\D/g, "").length >= 8);

  const openWhatsApp = () => {
    if (!posterPhone || !canContact) return;
    void Linking.openURL(
      buildWhatsAppListingUrl({
        phone: posterPhone,
        propertyType: labelListingType(listing.listingType),
        area: listing.area,
      }),
    );
  };

  const openCall = () => {
    if (!callPhone || !canCall) return;
    void Linking.openURL(`tel:${callPhone}`);
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {canContact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact on WhatsApp"
          onPress={openWhatsApp}
          style={styles.primary}
        >
          <Ionicons
            name="logo-whatsapp"
            size={18}
            color={Skoun.color.surface}
          />
          <LText variant="subtitle" style={styles.primaryText}>
            WhatsApp
          </LText>
        </Pressable>
      ) : null}

      {canCall ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Call listing"
          onPress={openCall}
          style={canContact ? styles.outline : styles.primary}
        >
          <Ionicons
            name="call-outline"
            size={18}
            color={canContact ? Skoun.color.primary : Skoun.color.surface}
          />
          <LText
            variant="subtitle"
            style={canContact ? styles.outlineText : styles.primaryText}
          >
            Call
          </LText>
        </Pressable>
      ) : null}

      {!canContact && !canCall ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="WhatsApp contact soon"
          disabled
          style={[styles.primary, styles.primaryOff]}
        >
          <LText variant="subtitle" style={styles.primaryText}>
            WhatsApp soon
          </LText>
        </Pressable>
      ) : null}

      {reported ? (
        <View style={styles.outline}>
          <LText variant="subtitle" style={styles.reportedText}>
            Reported
          </LText>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report listing"
          accessibilityHint="Opens reasons to flag this listing"
          onPress={onReport}
          style={styles.outline}
        >
          <LText variant="subtitle" style={styles.outlineText}>
            Report
          </LText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: Skoun.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Skoun.color.border,
  },
  primary: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Skoun.color.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryOff: { opacity: 0.5 },
  primaryText: { color: Skoun.color.surface },
  outline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.surface,
  },
  outlineText: { color: Skoun.color.primary },
  reportedText: { color: Skoun.color.inkMuted },
});
