import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
import {
  hasUsableWhatsAppPhone,
  listingAllowsWhatsApp,
} from "@/lib/whatsapp";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  posterPhone: string | null;
  onWhatsApp: () => void;
  reported: boolean;
  onReport: () => void;
  canReport?: boolean;
};

export function ListingDetailBottomBar({
  listing,
  posterPhone,
  onWhatsApp,
  reported,
  onReport,
  canReport = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const whatsAppOpen = listingAllowsWhatsApp(listing.availability);
  const canContact = whatsAppOpen && hasUsableWhatsAppPhone(posterPhone);
  const callPhone = listing.contactPhone ?? null;
  const canCall = Boolean(callPhone && callPhone.replace(/\D/g, "").length >= 8);



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
          onPress={onWhatsApp}
          style={styles.primary}
        >
          <Ionicons
            name="logo-whatsapp"
            size={18}
            color={Studently.color.surface}
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
            color={canContact ? Studently.color.primary : Studently.color.surface}
          />
          <LText
            variant="subtitle"
            style={canContact ? styles.outlineText : styles.primaryText}
          >
            Call
          </LText>
        </Pressable>
      ) : null}

      {!canContact && !canCall && whatsAppOpen ? (
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

      {canReport && reported ? (
        <View style={styles.outline}>
          <LText variant="subtitle" style={styles.reportedText}>
            Reported
          </LText>
        </View>
      ) : canReport ? (
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
      ) : null}
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
    backgroundColor: Studently.color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Studently.color.border,
  },
  primary: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Studently.color.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryOff: { opacity: 0.5 },
  primaryText: { color: Studently.color.surface },
  outline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.surface,
  },
  outlineText: { color: Studently.color.primary },
  reportedText: { color: Studently.color.inkMuted },
});
