import { useLocalSearchParams } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { ListingDetailMobile } from "@/components/listings/detail/ListingDetailMobile";
import { ListingDetailWeb } from "@/components/web/ListingDetailWeb";
import { WebShell } from "@/components/web/WebShell";
import { Skoun } from "@/constants/theme";

const MOBILE_MAX = 900;

export default function RenterListingDetailWebScreen({
  listingId,
  onClose,
}: {
  listingId?: string;
  onClose?: () => void;
} = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const resolvedId = listingId ?? id ?? "";

  if (width < MOBILE_MAX || onClose) {
    return (
      <View style={styles.mobile}>
        <ListingDetailMobile listingId={resolvedId} onClose={onClose} />
      </View>
    );
  }

  return (
    <WebShell showFooter={false}>
      <ListingDetailWeb listingId={resolvedId} />
    </WebShell>
  );
}

const styles = StyleSheet.create({
  mobile: {
    flex: 1,
    width: "100%",
    minHeight: "100vh" as unknown as number,
    backgroundColor: "#F9FAFB",
  },
});
