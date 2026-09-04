import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { StudentBenefitsPage } from "@/components/campus/StudentBenefitsPage";
import { Skoun } from "@/constants/theme";

const Screen = Platform.OS === "web" ? View : SafeAreaView;

export default function CampusBenefits() {
  return (
    <Screen
      style={styles.root}
      {...(Platform.OS === "web" ? {} : { edges: ["top"] })}
    >
      <CampusTopNav />
      <View style={styles.body}>
        <StudentBenefitsPage />
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
