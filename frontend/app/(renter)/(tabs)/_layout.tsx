import { useCallback } from "react";
import { DynamicColorIOS, Platform } from "react-native";
import { router, useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Skoun } from "@/constants/theme";
import { useMigrateLocalSaved } from "@/features/saved/useSavedListings";

const tint =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        light: Skoun.color.primary,
        dark: "#6B9CF5",
      })
    : Skoun.color.primary;

/**
 * SDK 55+ uses NativeTabs.Trigger.Label / .Icon (standalone Label/Icon
 * imports are ignored, which showed raw route names like "(explore)").
 */
const SEARCH_PATH = "/(renter)/(tabs)/(explore)/search" as const;

export default function RenterTabsLayout() {
  useMigrateLocalSaved();
  const segments = useSegments();
  const openFindMyPlace = useCallback(() => {
    if ((segments as readonly string[]).includes("search")) {
      router.setParams({ guide: "1" });
      return;
    }
    router.navigate({
      pathname: SEARCH_PATH,
      params: { guide: "1" },
    } as never);
  }, [segments]);

  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: Skoun.color.inkMuted }}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "magnifyingglass", selected: "magnifyingglass" }}
          md="search"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "heart", selected: "heart.fill" }}
          md="favorite"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="find"
        hidden={Platform.OS !== "ios"}
        role={Platform.OS === "ios" ? "search" : undefined}
        disabled={Platform.OS === "ios"}
        accessibilityLabel="Find my place"
        listeners={{ tabPress: openFindMyPlace }}
      >
        <NativeTabs.Trigger.Label hidden>Find my place</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("../../../assets/lottie/find-place-bot-icon.png")}
          renderingMode="original"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
