import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { formatUsdFromCents } from "@/lib/format";
import type { CreditTransaction } from "@/types/credits";

type Props = {
  transaction: CreditTransaction;
  supportPhone?: string;
};

export function PendingPaymentCard({
  transaction,
  supportPhone = "96100000000",
}: Props) {
  return (
    <View style={styles.card}>
      <LText variant="label" tone="brass">
        Pending payment
      </LText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy payment reference"
        onPress={() => void Clipboard.setStringAsync(transaction.referenceId)}
        style={styles.refRow}
      >
        <LText variant="title">{transaction.referenceId}</LText>
        <Ionicons
          name="copy-outline"
          size={20}
          color={Lister.color.primary}
        />
      </Pressable>
      <LText variant="body" tone="muted">
        Send {formatUsdFromCents(transaction.amountUsdCents)} via{" "}
        {transaction.channel.toUpperCase()}, then WhatsApp the receipt with this
        reference.
      </LText>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          const text = `Hi Skoun support — payment for ${transaction.referenceId}`;
          void Linking.openURL(
            `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`,
          );
        }}
        style={styles.wa}
      >
        <Ionicons name="logo-whatsapp" size={18} color={Lister.color.primary} />
        <LText variant="subtitle" tone="primary">
          Message WhatsApp support
        </LText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.lg,
    padding: Lister.space.md,
    borderWidth: 1,
    borderColor: Lister.color.brass,
    gap: 10,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Lister.color.brassSoft,
    padding: 12,
    borderRadius: Lister.radius.md,
  },
  wa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
});
