import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { StudentlyHomePage } from "@/components/web/home/StudentlyHomePage";
import { Studently } from "@/constants/theme";

/**
 * Web marketing homepage — Amber-inspired layout, Studently brand + product truth.
 */
export default function IndexWeb() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          minHeight: "100%" as unknown as number,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Studently.color.bg,
        }}
      >
        <ActivityIndicator color={Studently.color.primary} />
      </View>
    );
  }

  return <StudentlyHomePage />;
}
