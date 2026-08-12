import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

export default function OAuthCallbackScreen() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      WebBrowser.maybeCompleteAuthSession();
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
  },
});
