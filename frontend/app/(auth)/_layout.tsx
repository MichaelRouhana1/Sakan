import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Lister } from "@/constants/listerTheme";

export default function AuthLayout() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Lister.color.bg,
        }}
      >
        <ActivityIndicator color={Lister.color.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "Skoun",
        headerTintColor: Lister.color.ink,
        headerStyle: { backgroundColor: Lister.color.bg },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: Lister.type.bodySemi,
          color: Lister.color.ink,
        },
      }}
    >
      <Stack.Screen
        name="phone"
        options={{ title: "Sign in", headerBackVisible: false }}
      />
      <Stack.Screen name="otp" options={{ title: "Verify" }} />
      <Stack.Screen
        name="role-select"
        options={{ title: "Your role", headerBackVisible: false }}
      />
    </Stack>
  );
}
