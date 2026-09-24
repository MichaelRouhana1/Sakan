import { View } from "react-native";
import { Compass } from "lucide-react-native";
import { Skoun } from "@/constants/theme";
import { skounShadow } from "@/lib/skounShadow";

export function BotAvatar({
  size = 32,
}: {
  playing?: boolean;
  playOnHover?: boolean;
  size?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        ...skounShadow({ blur: 6, y: 2, opacity: 0.28, elevation: 3 }),
      }}
    >
      <Compass
        size={Math.round(size * 0.62)}
        color={Skoun.color.primary}
        strokeWidth={1.6}
      />
    </View>
  );
}
