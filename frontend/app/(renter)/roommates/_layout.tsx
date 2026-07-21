import { Stack } from "expo-router";

export default function RoommatesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="looking-card" />
      <Stack.Screen name="invite/[id]" />
      <Stack.Screen name="match/[id]" />
      <Stack.Screen name="guidelines" />
    </Stack>
  );
}
