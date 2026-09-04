import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CampusHomePage } from "@/components/campus/CampusHomePage";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";

const Screen = Platform.OS === "web" ? View : SafeAreaView;

export default function CampusIndex() {
  return (
    <Screen style={styles.root} {...(Platform.OS === "web" ? {} : { edges: ["top"] })}>
      <CampusTopNav />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <CampusHomePage />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Skoun.color.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  bodyContent: {
    paddingBottom: 32,
  },
});
