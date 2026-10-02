import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HostListingAnalyticsPage } from "@/components/web/host/HostListingAnalyticsPage";
import { Skoun } from "@/constants/theme";

function firstParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return value?.[0] ?? "";
}

export default function PosterListingAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <HostListingAnalyticsPage listingId={firstParam(id)} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Skoun.color.bg,
  },
  safe: {
    flex: 1,
  },
});
