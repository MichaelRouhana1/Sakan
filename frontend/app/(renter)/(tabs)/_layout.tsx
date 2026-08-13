import Ionicons from "@expo/vector-icons/Ionicons";
import { DynamicColorIOS, Platform } from "react-native";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Skoun } from "@/constants/theme";
import { useMigrateLocalSaved } from "@/features/saved/useSavedListings";

const tint =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        light: Skoun.color.primary,
        dark: "#6B9CF5",
      })
    : Skoun.color.primary;

export default function RenterTabsLayout() {
  useMigrateLocalSaved();

  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: Skoun.color.inkMuted }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="(explore)">
        <Label>Search</Label>
        <Icon
          sf={{ default: "magnifyingglass", selected: "magnifyingglass" }}
          androidSrc={<VectorIcon family={Ionicons} name="search" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Label>Saved</Label>
        <Icon
          sf={{ default: "heart", selected: "heart.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="heart" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="person" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
