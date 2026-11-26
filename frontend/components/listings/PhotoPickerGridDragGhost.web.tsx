import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
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
  showCover?: boolean;
};

export function PhotoPickerGridDragGhost({
  ghost,
  pointer,
  showCover = false,
}: Props) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
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
      style={[
        styles.ghost,
        {
          left,
          top,
          width: ghost.width,
          height: ghost.height,
          pointerEvents: "none",
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
      {showCover ? (
        <View style={styles.coverBadge}>
          <LText variant="caption" style={styles.coverBadgeText}>
            Cover
          </LText>
        </View>
      ) : null}
    </View>,
    portalRoot,
  );
}

const baseStyles = StyleSheet.create({
  ghost: {
    position: "fixed",
    zIndex: 9999,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    backgroundColor: Lister.color.surface,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
    ...(Platform.OS === "web"
      ? ({ pointerEvents: "none" } as ViewStyle)
      : null),
  },
  ghostLift: Platform.select({
    web: {
      transform: [{ scale: 1.05 }],
      boxShadow: "0 16px 40px rgba(18, 24, 38, 0.24)",
    } as ViewStyle,
    default: {},
  }),
  image: {
    width: "100%",
    height: "100%",
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: Lister.color.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Lister.radius.pill,
    pointerEvents: "none",
  },
  coverBadgeText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
    fontSize: 11,
  },
});
