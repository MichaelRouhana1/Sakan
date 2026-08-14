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

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canContact ? "Contact on WhatsApp" : "WhatsApp contact soon"
        }
        accessibilityHint={
          canContact
            ? undefined
            : "Landlord phone will appear when account linking is ready"
        }
        disabled={!canContact}
        onPress={openWhatsApp}
        style={[styles.primary, !canContact && styles.primaryOff]}
      >
        {canContact ? (
          <Ionicons
            name="logo-whatsapp"
            size={18}
            color={Skoun.color.surface}
          />
        ) : null}
        <LText variant="subtitle" style={styles.primaryText}>
          {canContact ? "WhatsApp" : "WhatsApp soon"}
        </LText>
      </Pressable>

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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.surface,
  },
  outlineText: { color: Skoun.color.primary },
  reportedText: { color: Skoun.color.inkMuted },
});
