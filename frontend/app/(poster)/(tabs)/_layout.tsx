import { NativeTabs } from "expo-router/native-tabs";
import { Lister } from "@/constants/listerTheme";

/**
 * SDK 55+ uses NativeTabs.Trigger.Label / .Icon (standalone Label/Icon
 * imports are ignored, which showed raw route names like "index").
 * Glyphs match the desktop host side nav: house, chart, wallet.
 */
export default function PosterTabsLayout() {
  return (
    <NativeTabs
      tintColor={Lister.color.primary}
      labelStyle={{ color: Lister.color.inkMuted }}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
      unstable_nativeProps={{ colorScheme: "light" }}
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
      <NativeTabs.Trigger name="host-profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
