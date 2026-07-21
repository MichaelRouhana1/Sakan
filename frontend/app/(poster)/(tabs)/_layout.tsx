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
        dark: "#5FD4A8",
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
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="grid-outline" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Label>Create</Label>
        <Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="add-circle" />}
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
