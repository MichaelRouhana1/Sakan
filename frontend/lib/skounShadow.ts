import { Platform, type ViewStyle } from "react-native";

function hexToRgbChannels(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return "18, 24, 38";
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return "18, 24, 38";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * iOS/Android keep shadow* + elevation. Web uses boxShadow so RN-web
 * does not warn about deprecated shadow* props.
 */
export function skounShadow({
  color = "#121826",
  opacity = 0.12,
  blur,
  x = 0,
  y = 0,
  elevation,
}: {
  color?: string;
  opacity?: number;
  blur: number;
  x?: number;
  y?: number;
  elevation?: number;
}): ViewStyle {
  if (Platform.OS === "web") {
    return {
      boxShadow: `${x}px ${y}px ${blur}px rgba(${hexToRgbChannels(color)}, ${opacity})`,
    } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: blur,
    shadowOffset: { width: x, height: y },
    ...(elevation != null ? { elevation } : null),
  };
}
