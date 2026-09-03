import { useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BenefitDetailPage } from "@/components/campus/BenefitDetailPage";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";

const Screen = Platform.OS === "web" ? View : SafeAreaView;

export default function CampusBenefitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen
      style={styles.root}
      {...(Platform.OS === "web" ? {} : { edges: ["top"] })}
    >
      <CampusTopNav />
      <View style={styles.body}>
        <BenefitDetailPage id={Array.isArray(id) ? (id[0] ?? "") : (id ?? "")} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
