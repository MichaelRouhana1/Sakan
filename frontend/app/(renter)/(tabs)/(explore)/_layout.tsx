import { Stack } from "expo-router";

export default function SearchStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        scrollEdgeEffects: { bottom: "hidden" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
