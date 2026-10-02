import { useCallback } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";

const SEARCH_PATH = "/(renter)/(tabs)/(explore)/search" as const;

/** Fallback if this tab is opened directly. The footer button itself does not select it. */
export default function FindMyPlaceTab() {
  useFocusEffect(
    useCallback(() => {
      router.navigate({
        pathname: SEARCH_PATH,
        params: { guide: "1" },
      } as never);
    }, []),
  );
  return <View />;
}
