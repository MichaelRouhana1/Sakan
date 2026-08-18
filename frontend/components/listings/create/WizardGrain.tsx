import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";

const NOISE =
  'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/></filter><rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.55%27/></svg>")';

/** Subtle grain + cool mist — atmosphere without liquid-glass blur. */
export function WizardGrain() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0)", Lister.color.surface]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === "web" ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: 0.07,
              backgroundImage: NOISE,
              backgroundRepeat: "repeat",
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}
