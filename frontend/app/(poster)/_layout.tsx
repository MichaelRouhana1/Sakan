import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

export default function PosterLayout() {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "house", android: "home", web: "home" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "plus.circle", android: "add", web: "add" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: "Credits",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "creditcard", android: "payment", web: "payment" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="listing/[id]"
        options={{
          href: null,
          title: "Listing",
        }}
      />
    </Tabs>
  );
}
