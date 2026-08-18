import type { ReactNode } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function Enter({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <Animated.View
      entering={FadeInDown.duration(Lister.motion.enterMs).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
