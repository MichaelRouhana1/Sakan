import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { HostListingsPage } from "@/components/web/host/HostListingsPage";

export default function HostListingRoute() {
  if (Platform.OS !== "web") {
    return <Redirect href="/(poster)/(tabs)" />;
  }
  return <HostListingsPage />;
}
