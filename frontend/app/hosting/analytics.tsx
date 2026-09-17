import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { HostAnalyticsPage } from "@/components/web/host/HostAnalyticsPage";

export default function HostAnalyticsRoute() {
  if (Platform.OS !== "web") {
    return <Redirect href="/(poster)/(tabs)" />;
  }
  return <HostAnalyticsPage />;
}
