import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { HostCreditsPage } from "@/components/web/host/HostCreditsPage";

export default function HostCreditsRoute() {
  if (Platform.OS !== "web") {
    return <Redirect href="/(poster)/(tabs)/credits" />;
  }
  return <HostCreditsPage />;
}
