import type { ReactNode, RefObject } from "react";
import { StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";

type Props = {
  open: boolean;
  triggerRef: RefObject<View | null>;
  onClose: () => void;
  reducedMotion?: boolean;
  children: ReactNode;
};

export function AreaDropdownPortal({ open, children }: Props) {
  if (!open) return null;
  return (
    <View testID="location-area-menu" style={styles.menu}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
