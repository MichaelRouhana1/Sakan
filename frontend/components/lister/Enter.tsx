import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export const EnterAnimationContext = createContext(true);

export function Enter({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const enabled = useContext(EnterAnimationContext);
  if (!enabled) return <View>{children}</View>;
  if (reduce) return <>{children}</>;
  return (
    <Animated.View
      entering={FadeInDown.duration(Lister.motion.enterMs).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
