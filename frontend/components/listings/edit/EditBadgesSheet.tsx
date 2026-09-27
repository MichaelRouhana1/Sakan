import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SLIDE_MS = 280;

type Props = {
  onClose: () => void;
  children: ReactNode;
};

export function EditBadgesSheet({ onClose, children }: Props) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(reduced);
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
    if (Platform.OS === "web" && !portalRoot) return;
    closing.current = false;
    if (reduced) {
      setOpen(true);
      return;
    }
    setOpen(false);
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [portalRoot, reduced]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      beginClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [reduced]);

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) clearTimeout(closeTimer.current);
    };
  }, []);

  const motion =
    Platform.OS === "web" && !reduced
      ? {
          transitionProperty: "transform",
          transitionDuration: `${SLIDE_MS}ms`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      : null;

  const page = (
    <View
      accessibilityViewIsModal
      style={[
        styles.page,
        Platform.OS === "web" ? styles.pageWeb : { paddingTop: insets.top },
        { transform: [{ translateX: open ? 0 : width }] },
        !open && styles.pageOff,
        motion,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to listing"
          onPress={beginClose}
          style={({ pressed, hovered }) => [
            styles.back,
            hovered && styles.backHover,
            pressed && styles.backPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={Lister.color.ink} />
        </Pressable>
        <LText variant="subtitle" style={styles.title}>
          Edit badges
        </LText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={beginClose}
          style={({ pressed, hovered }) => [
            styles.done,
            hovered && styles.doneHover,
            pressed && styles.donePressed,
          ]}
        >
          <LText variant="caption" style={styles.doneLabel}>
            Done
          </LText>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );

  if (Platform.OS !== "web") {
    return (
      <Modal visible animationType="none" onRequestClose={beginClose} statusBarTranslucent>
        <View style={[styles.nativeRoot, { opacity: open ? 1 : 0 }]}>{page}</View>
      </Modal>
    );
  }

  if (!portalRoot) return null;

  return createPortal(
    <View style={[styles.root, { opacity: open ? 1 : 0 }, motion && { transitionProperty: "opacity, transform" }]}>
      {page}
    </View>,
    portalRoot,
  );
}

const styles = StyleSheet.create({
  root: {
    position: "fixed" as unknown as "absolute",
    top: WEB_NAV_HEIGHT,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 70,
  },
  nativeRoot: {
    flex: 1,
    backgroundColor: Lister.color.bg,
  },
  page: {
    flex: 1,
    backgroundColor: Lister.color.bg,
  },
  pageWeb: {
    height: "100%",
  },
  pageOff: {
    ...(Platform.OS === "web" ? { pointerEvents: "none" as const } : null),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  backHover: {
    backgroundColor: Lister.color.primaryMist,
  },
  backPressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    fontFamily: Lister.type.displaySerif,
    fontSize: 20,
    lineHeight: 26,
  },
  done: {
    height: 34,
    minWidth: 72,
    paddingHorizontal: 16,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.primary,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  doneHover: {
    backgroundColor: Lister.color.primaryDeep,
  },
  donePressed: {
    opacity: 0.88,
  },
  doneLabel: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    width: "100%",
    paddingLeft: 48,
    paddingRight: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },
});
