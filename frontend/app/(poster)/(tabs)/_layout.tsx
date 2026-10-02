import { DynamicColorIOS, Platform } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Lister } from "@/constants/listerTheme";

const tint =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        light: Lister.color.primary,
        dark: "#6B9CF5",
      })
    : Lister.color.primary;

/**
 * SDK 55+ uses NativeTabs.Trigger.Label / .Icon (standalone Label/Icon
 * imports are ignored, which showed raw route names like "index").
 * Glyphs match the desktop host side nav: house, chart, wallet.
 */
export default function PosterTabsLayout() {
  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: Lister.color.inkMuted }}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>Analytics</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          md="bar_chart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="credits">
        <NativeTabs.Trigger.Label>Credits</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }}
          md="account_balance_wallet"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
