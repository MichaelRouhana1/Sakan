import { Stack } from "expo-router";
import { Lister } from "@/constants/listerTheme";

export default function AuthLayout() {
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
        name="role-select"
        options={{ title: "Your role", headerBackVisible: false }}
      />
    </Stack>
  );
}
