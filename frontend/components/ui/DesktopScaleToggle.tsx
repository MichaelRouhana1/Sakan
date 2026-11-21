import { Pressable, StyleSheet, Text, View } from "react-native";
import { DESKTOP_DESIGN_SCALE } from "@/constants/desktopDesign";
import { Studently } from "@/constants/theme";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";

type Props = {
  /** Homepage hero nav sits on a photo until it scrolls solid. */
  tone?: "ink" | "hero";
};

/** Dev-only 1.0 / 1.1 control. Hidden in production and below the desktop breakpoint. */
export function DesktopScaleToggle({ tone = "ink" }: Props) {
  const { isDesktop, scale, setScale, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  if (!__DEV__ || !isDesktop) return null;
  const hero = tone === "hero";
  return (
    <View style={[styles.bar, hero && styles.barHero]} accessibilityLabel="Scale: 1.0 / 1.1">
      <Text style={[styles.text, hero && styles.textHero]}>Scale:</Text>
      <Pressable
        onPress={() => setScale(1)}
        accessibilityRole="button"
        accessibilityLabel="Scale 1.0"
        accessibilityState={{ selected: scale === 1 }}
      >
        <Text style={[styles.text, styles.choice, hero && styles.textHero, scale === 1 && styles.on]}>1.0</Text>
      </Pressable>
      <Text style={[styles.text, hero && styles.textHero]}>/</Text>
      <Pressable
        onPress={() => setScale(DESKTOP_DESIGN_SCALE)}
        accessibilityRole="button"
        accessibilityLabel="Scale 1.1"
        accessibilityState={{ selected: scale !== 1 }}
      >
        <Text style={[styles.text, styles.choice, hero && styles.textHero, scale !== 1 && styles.on]}>1.1</Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(18,24,38,0.06)",
  },
  barHero: { backgroundColor: "rgba(18,24,38,0.38)" },
  text: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 16,
    color: Studently.color.ink,
  },
  textHero: { color: "#fff" },
  choice: {
    minWidth: 24,
    textAlign: "center",
    opacity: 0.55,
  },
  on: { opacity: 1 },
});
