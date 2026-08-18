import {
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { CreateWizardShell } from "@/components/listings/create/CreateWizardShell";
import { Lister } from "@/constants/listerTheme";
import { CreateListingProvider } from "@/features/listings/create/CreateListingProvider";

export default function CreateListingScreen() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    PlayfairDisplay_700Bold,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Lister.color.bg,
        }}
      >
        <ActivityIndicator color={Lister.color.primary} />
      </View>
    );
  }

  return (
    <CreateListingProvider>
      <CreateWizardShell />
    </CreateListingProvider>
  );
}
