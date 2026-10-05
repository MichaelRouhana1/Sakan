import type { ReactNode, RefObject } from "react";
import { View } from "react-native";
import { Skoun } from "@/constants/theme";

/** Native keeps the list under the button. Web portals it above the cards. */
export function PrefsPopover({
  open,
  children,
}: {
  open: boolean;
  anchorRef?: RefObject<View | null>;
  onEnter?: () => void;
  onLeave?: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: 32,
        left: 0,
        zIndex: 80,
        width: 260,
        gap: 6,
        padding: 12,
        borderRadius: 12,
        backgroundColor: Skoun.color.surface,
        borderWidth: 1,
        borderColor: Skoun.color.bgWash,
      }}
    >
      {children}
    </View>
  );
}
