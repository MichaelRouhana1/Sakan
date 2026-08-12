import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import "react-native-reanimated";
import { ClerkProvider, ClerkLoaded, useClerk } from "@clerk/expo";

WebBrowser.maybeCompleteAuthSession();

import { Platform, View } from "react-native";
import { useColorScheme } from "@/components/useColorScheme";
import { queryClient } from "@/lib/queryClient";
import { tokenCache } from "@/lib/tokenCache";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

if (!publishableKey) {
  console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in frontend/.env");
}

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

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <RootLayoutNav />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const clerk = useClerk();

  useEffect(() => {
    // Process OAuth redirect params on Web if present in URL
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location.search.includes("__clerk")
    ) {
      clerk.handleRedirectCallback({
        afterSignInUrl: "/",
        afterSignUpUrl: "/",
      });
    }
  }, [clerk]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View id="clerk-captcha" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(renter)" />
          <Stack.Screen name="(poster)" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
