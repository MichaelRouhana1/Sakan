import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type DragGhostModel = {
  localId: string;
  uri: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

type Props = {
  ghost: DragGhostModel;
  pointer: { x: number; y: number };
};

export function PhotoPickerGridDragGhost({ ghost, pointer }: Props) {
  const reducedMotion = useReducedMotion();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const left = pointer.x - ghost.offsetX;
  const top = pointer.y - ghost.offsetY;

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <View
      pointerEvents="none"
      style={[
        styles.ghost,
        {
          left,
          top,
          width: ghost.width,
          height: ghost.height,
        },
        !reducedMotion ? styles.ghostLift : null,
      ]}
    >
      <Image
        source={{ uri: ghost.uri }}
        style={styles.image}
        contentFit="cover"
        transition={0}
      />
    </View>,
    portalRoot,
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: "fixed",
    zIndex: 9999,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    ...(Platform.OS === "web"
      ? ({ pointerEvents: "none" } as ViewStyle)
      : null),
  },
  ghostLift: Platform.select({
    web: {
      transform: [{ scale: 1.06 }],
      boxShadow: "0 16px 40px rgba(18, 24, 38, 0.22)",
    } as ViewStyle,
    default: {},
  }),
  image: {
    width: "100%",
    height: "100%",
  },
});
