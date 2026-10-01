import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SwitchRoleControl } from "@/components/auth/SwitchRoleControl";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { HostCreditsPage } from "@/components/web/host/HostCreditsPage";
import { Skoun } from "@/constants/theme";

export default function CreditsScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <HideIosTabScrollFade style={styles.safe}>
          <ScrollView contentContainerStyle={styles.content}>
            <HostCreditsPage />
            <View style={styles.switchWrap}>
              <SwitchRoleControl currentRole="poster" />
            </View>
          </ScrollView>
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
  content: {
    paddingBottom: appleTabScrollInset,
  },
  switchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-start",
  },
});
