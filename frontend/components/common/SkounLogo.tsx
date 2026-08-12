import { Platform, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * High-definition vector logo component for Skoun (house roof + location pin).
 * Renders crisp and sharp at any screen density (Retina, 4K, mobile, web).
 */
export function SkounLogo({ size = 32, style }: Props) {
  if (Platform.OS === "web") {
    const SVG = "svg" as any;
    const Path = "path" as any;
    const Circle = "circle" as any;

    return (
      <View style={[{ width: size, height: size }, style]}>
        <SVG
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          {/* Left half pin fill (light teal) */}
          <Path
            d="M 50 20 C 34 20 22 32 22 48 C 22 66 43 84 50 92 L 50 20 Z"
            fill="#8FE0D1"
          />
          {/* Right half pin fill (deeper teal) */}
          <Path
            d="M 50 20 L 50 92 C 57 84 78 66 78 48 C 78 32 66 20 50 20 Z"
            fill="#64CBB9"
          />
          {/* Pin outer outline contour (Dark Navy) */}
          <Path
            d="M 50 20 C 34 20 22 32 22 48 C 22 67 44 85 50 92 C 56 85 78 67 78 48 C 78 32 66 20 50 20 Z"
            stroke="#164268"
            strokeWidth="5"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Inner ring (Dark Navy) */}
          <Circle
            cx="50"
            cy="47"
            r="15"
            stroke="#164268"
            strokeWidth="5.5"
            fill="#FFFFFF"
          />
          {/* House Roof & Chimney (Dark Navy) */}
          <Path
            d="M 10 37 L 50 9 L 90 37 M 63 18.5 V 10 H 73 V 25.5"
            stroke="#164268"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </SVG>
      </View>
    );
  }

  return null;
}
