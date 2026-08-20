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
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { CreateWizardShell } from "@/components/listings/create/CreateWizardShell";
import { Lister } from "@/constants/listerTheme";
import { CreateListingProvider } from "@/features/listings/create/CreateListingProvider";
import type { DraftSlot } from "@/features/listings/create/draft";

export default function CreateListingScreen() {
  const { new: newParam, working: workingParam } = useLocalSearchParams<{
    new?: string;
    working?: string;
  }>();
  const startFresh = newParam === "1";
  const draftSlot: DraftSlot =
    startFresh || workingParam === "1" ? "working" : "main";

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
    <CreateListingProvider startFresh={startFresh} draftSlot={draftSlot}>
      <CreateWizardShell />
    </CreateListingProvider>
  );
}
