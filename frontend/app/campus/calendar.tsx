import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AcademicCalendarPage } from "@/components/campus/AcademicCalendarPage";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";

const Screen = Platform.OS === "web" ? View : SafeAreaView;

export default function CampusCalendar() {
  return (
    <Screen style={styles.root} {...(Platform.OS === "web" ? {} : { edges: ["top"] })}>
      <CampusTopNav />
      <View style={styles.body}>
        <AcademicCalendarPage />
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
