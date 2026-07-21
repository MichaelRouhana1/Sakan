import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lister } from "@/constants/listerTheme";

type Props = ViewProps & {
  children: ReactNode;
  edges?: ("top" | "right" | "bottom" | "left")[];
};

export function ListerScreen({
  children,
  style,
  edges = ["top", "left", "right"],
  ...rest
}: Props) {
  return (
    <View style={styles.root} {...rest}>
      <LinearGradient
        colors={[Lister.color.bgWash, Lister.color.bg, Lister.color.primaryMist]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Lister.color.bg,
  },
  safe: {
    flex: 1,
  },
});
