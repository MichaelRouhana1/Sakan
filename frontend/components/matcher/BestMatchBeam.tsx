import { View } from "react-native";
import type { ReactNode } from "react";

/** Native has no border-beam. The badge still marks the closest listing. */
export function BestMatchBeam({
  active,
  raised = false,
  children,
}: {
  active: boolean;
  raised?: boolean;
  children: ReactNode;
}) {
  if (!active) return children;
  return (
    <View style={{ position: "relative", width: "100%", zIndex: raised ? 6 : 1 }}>
      {children}
    </View>
  );
}
