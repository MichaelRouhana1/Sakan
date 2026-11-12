import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { InitialLoadingScreen } from "@/components/common/InitialLoadingScreen";
import { StudentlyHomePage } from "@/components/web/home/StudentlyHomePage";

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

  if (!loaded) return <InitialLoadingScreen />;

  return <StudentlyHomePage />;
}
