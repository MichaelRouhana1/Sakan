import { DynamicColorIOS, Platform } from "react-native";
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
export default function RenterTabsLayout() {
  useMigrateLocalSaved();

  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: Skoun.color.inkMuted }}
      minimizeBehavior="onScrollDown"
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
    </NativeTabs>
  );
}
