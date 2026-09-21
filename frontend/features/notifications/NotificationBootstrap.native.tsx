import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { api } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function safeOutcomePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/hosting\/listing\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/outcome$/i.test(value)
    ? value
    : null;
}

export function NotificationBootstrap() {
  const router = useRouter();
  const { isSignedIn, user } = useAuthSession();
  const lastResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (isSignedIn && user?.role === "poster" && user.expiryPushEnabled === false) {
      void api
        .delete("/api/users/me/push-tokens", { data: { all: true } })
        .catch((error) => console.warn("Push token removal failed", error));
      return;
    }
    if (
      !isSignedIn ||
      user?.role !== "poster" ||
      user.expiryPushEnabled === false
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!Constants.isDevice) return;
      const current = await Notifications.getPermissionsAsync();
      const permission =
        current.status === "granted"
          ? current
          : await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") {
        if (!cancelled) {
          await api.delete("/api/users/me/push-tokens", { data: { all: true } });
        }
        return;
      }
      if (cancelled) return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("listing-expiry", {
          name: "Listing expiry reminders",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) return;
      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
      if (cancelled) return;
      await api.post("/api/users/me/push-tokens", {
        token,
        platform: Platform.OS,
      });
    })().catch((error) => {
      console.warn("Push registration failed", error);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.role, user?.expiryPushEnabled]);

  useEffect(() => {
    function open(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (lastResponseId.current === id) return;
      const path = safeOutcomePath(
        response.notification.request.content.data?.path,
      );
      if (!path) return;
      lastResponseId.current = id;
      router.push(path as never);
    }

    void Notifications.getLastNotificationResponseAsync().then(open);
    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);

  return null;
}
