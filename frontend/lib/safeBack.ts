import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { router, type Href } from "expo-router";

/** Go back when possible; otherwise land on a known home route. */
export function safeBack(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

/** Android hardware back — avoid unhandled GO_BACK when stack is empty. */
export function useSafeHardwareBack(fallback: Href) {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      safeBack(fallback);
      return true;
    });
    return () => sub.remove();
  }, [fallback]);
}
