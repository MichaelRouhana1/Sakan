import { Text, View, useColorScheme } from "react-native";

/** Native stub. Admin console is web-only. */
export function AdminWebOnly() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: dark ? "#232833" : "#E4E9F0",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "600",
          color: dark ? "#E8ECF2" : "#1C2430",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Skoun Ops
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: dark ? "#B4BCCB" : "#4E5968",
          textAlign: "center",
        }}
      >
        Admin dashboard runs in a browser. Open /admin on web.
      </Text>
    </View>
  );
}
