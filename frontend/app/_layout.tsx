import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ClerkProvider } from "@clerk/expo";
import "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

import { useColorScheme } from "@/components/useColorScheme";
import { AuthSessionProvider } from "@/features/auth/AuthSessionProvider";
import {
  CLERK_PUBLISHABLE_KEY,
  ClerkEnabledProvider,
  isClerkEnabled,
} from "@/lib/clerkEnabled";
import { queryClient } from "@/lib/queryClient";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

const tokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === "web") {
        return typeof window !== "undefined" ? localStorage.getItem(key) : null;
      }
      return SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          localStorage.setItem(key, value);
        }
        return;
      }
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const tree = (
    <ClerkEnabledProvider value={isClerkEnabled}>
      <AuthSessionProvider>
        <RootLayoutNav />
      </AuthSessionProvider>
    </ClerkEnabledProvider>
  );

  if (!isClerkEnabled) {
    return tree;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      {tree}
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(renter)" />
          <Stack.Screen name="(poster)" />
          <Stack.Screen name="hosting" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

