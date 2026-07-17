import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "Skoun",
      }}
    >
      <Stack.Screen name="phone" options={{ title: "Sign in" }} />
      <Stack.Screen name="otp" options={{ title: "Verify" }} />
      <Stack.Screen name="role-select" options={{ title: "Your role" }} />
    </Stack>
  );
}
