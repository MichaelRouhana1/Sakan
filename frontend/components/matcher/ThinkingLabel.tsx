import { Text } from "react-native";
import { matcherStyles as s } from "./matcherStyles";

export function ThinkingLabel() {
  return (
    <Text style={s.prompt} accessibilityLiveRegion="polite">
      Thinking...
    </Text>
  );
}
