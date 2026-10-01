import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { HostAnalyticsPage } from "@/components/web/host/HostAnalyticsPage";
import { Skoun } from "@/constants/theme";

export default function PosterAnalyticsScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <HideIosTabScrollFade style={styles.safe}>
          <HostAnalyticsPage />
        </HideIosTabScrollFade>
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
