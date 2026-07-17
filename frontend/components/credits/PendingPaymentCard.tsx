import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { formatUsdFromCents } from "@/lib/format";
import type { CreditTransaction } from "@/types/credits";

type Props = {
  transaction: CreditTransaction;
};

export function PendingPaymentCard({ transaction }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.ref}>{transaction.referenceId}</Text>
      <Text>
        Pay {formatUsdFromCents(transaction.amountUsdCents)} via{" "}
        {transaction.channel.toUpperCase()}
      </Text>
      <Text style={styles.hint}>
        Send receipt + reference ID to WhatsApp Support
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d0d0d0",
    gap: 4,
  },
  ref: {
    fontWeight: "700",
    fontSize: 18,
  },
  hint: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
});
