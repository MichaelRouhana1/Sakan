import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Layout wrapper around tab scroll content.
 * iOS 26 scroll-edge fade is disabled via Stack `scrollEdgeEffects`.
 */
export function HideIosTabScrollFade({ children, style }: Props) {
  return style ? <View style={style}>{children}</View> : <>{children}</>;
}
