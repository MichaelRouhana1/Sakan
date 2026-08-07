import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { SkounHomePage } from "@/components/web/home/SkounHomePage";
import { Skoun } from "@/constants/theme";

/**
 * Web marketing homepage — Amber-inspired layout, Skoun brand + product truth.
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
          backgroundColor: Skoun.color.bg,
        }}
      >
        <ActivityIndicator color={Skoun.color.primary} />
      </View>
    );
  }

  return <SkounHomePage />;
}
