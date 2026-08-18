import Ionicons from "@expo/vector-icons/Ionicons";
import { DynamicColorIOS, Platform } from "react-native";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Lister } from "@/constants/listerTheme";

const tint =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        light: Lister.color.primary,
        dark: "#6B9CF5",
      })
    : Lister.color.primary;

export default function PosterTabsLayout() {
  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: Lister.color.inkMuted }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <Label>Listings</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home-outline" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="credits">
        <Label>Credits</Label>
        <Icon
          sf={{ default: "sparkles", selected: "sparkles" }}
          androidSrc={<VectorIcon family={Ionicons} name="sparkles-outline" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
