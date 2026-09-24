import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { EditListingScreen } from "@/components/listings/edit/EditListingScreen";
import { Lister } from "@/constants/listerTheme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { EditListingProvider } from "@/features/listings/edit/EditListingProvider";
import { useReducedMotion } from "@/lib/useReducedMotion";

const PANEL_WIDTH = 480;
const SLIDE_MS = 280;

type Props = {
  listingId: string;
  onClose: () => void;
};

export function EditListingDrawer({ listingId, onClose }: Props) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const fullBleed = width < 760;
  const shift = fullBleed ? Math.max(width, PANEL_WIDTH) : PANEL_WIDTH;
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const closing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function beginClose() {
    if (closing.current) return;
    closing.current = true;
    if (reduced) {
      onCloseRef.current();
      return;
    }
    setOpen(false);
    closeTimer.current = setTimeout(() => onCloseRef.current(), SLIDE_MS);
  }

  useEffect(() => {
    if (Platform.OS !== "web") return;
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!portalRoot) return;
    closing.current = false;
    if (reduced) {
      setOpen(true);
      return;
    }
    setOpen(false);
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [listingId, portalRoot, reduced]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") beginClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reduced]);

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) clearTimeout(closeTimer.current);
    };
  }, []);

  const motion =
    Platform.OS === "web" && !reduced
      ? {
          transitionProperty: "transform, opacity",
          transitionDuration: `${SLIDE_MS}ms`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      : null;

  if (!portalRoot) return null;

  const sheet = (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close edit"
        onPress={beginClose}
        style={[styles.scrim, { opacity: open ? 1 : 0 }, motion]}
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.panel,
          fullBleed ? styles.panelFull : styles.panelFixed,
          { transform: [{ translateX: open ? 0 : shift }] },
          motion,
        ]}
      >
        <EditListingProvider listingId={listingId}>
          <EditListingScreen
            key={listingId}
            listingId={listingId}
            layout="panel"
            onClose={beginClose}
          />
        </EditListingProvider>
      </View>
    </View>
  );

  return createPortal(sheet, portalRoot);
}

const styles = StyleSheet.create({
  root: {
    position: "fixed" as unknown as "absolute",
    top: WEB_NAV_HEIGHT,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    flexDirection: "row",
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.18)",
    cursor: "pointer",
  },
  panel: {
    height: "100%",
    minHeight: 0,
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: Lister.color.bg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Lister.color.border,
    ...(Platform.OS === "web"
      ? { boxShadow: "-20px 0 48px rgba(18, 24, 38, 0.14)" }
      : null),
  },
  panelFixed: {
    width: PANEL_WIDTH,
  },
  panelFull: {
    width: "100%",
  },
});
