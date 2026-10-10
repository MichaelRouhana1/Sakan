import { Redirect, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";
import { HostCreditsPage } from "@/components/web/host/HostCreditsPage";

export default function HostCreditsRoute() {
  const params = useLocalSearchParams();
  if (Platform.OS !== "web") {
    return <Redirect href={{ pathname: "/(poster)/(tabs)/credits", params }} />;
  }
  return <HostCreditsPage />;
}
