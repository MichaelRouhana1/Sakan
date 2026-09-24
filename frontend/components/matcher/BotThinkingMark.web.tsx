import { View } from "react-native";
import { ThinkingOrb } from "thinking-orbs";

export function BotThinkingMark() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        zIndex: 2,
      }}
    >
      <ThinkingOrb
        state="breathing"
        size={20}
        theme="light"
        aria-label="Thinking"
      />
    </View>
  );
}
