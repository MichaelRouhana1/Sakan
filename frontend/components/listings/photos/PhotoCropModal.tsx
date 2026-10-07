import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { useColorScheme } from "@/components/useColorScheme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  boundedCrop,
  cropFromPosition,
  type CropRect,
} from "@/lib/photoCropGeometry";
import {
  cardPhotoHeight,
  detailPhotoFrame,
  NATIVE_CARD_PHOTO_MIN_HEIGHT,
  NATIVE_CARD_PHOTO_WIDTH,
  SEARCH_PHOTO_ASPECT,
} from "@/lib/listingPhotoFrames";
import type { PhotoCropController } from "@/features/listings/usePhotoCropQueue";
import { PhotoCropper } from "./PhotoCropper";
import { CropPreview } from "./CropPreview";
export function PhotoCropModal({
  controller,
  photoCount,
}: {
  controller: PhotoCropController;
  photoCount: number;
}) {
  const { state, queue } = controller;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";
  const reduced = useReducedMotion();
  const desktop = Platform.OS === "web" && width >= 900;
  const visible = !["idle", "picking"].includes(state.phase);
  const source = state.current;
  useEffect(() => {
    if (Platform.OS === "ios" && visible && state.position)
      AccessibilityInfo.announceForAccessibility(
        `Crop ${state.position} of ${state.total}`,
      );
  }, [visible, state.position, state.total]);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const cropSource = useRef<string | null>(null);
  const dialog = useRef<View>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCrop = useCallback(
    (rect: CropRect) => {
      if (source) cropSource.current = source.uri;
      setCrop(rect);
    },
    [source],
  );
  const activeCrop = source
    ? crop && cropSource.current === source.uri
      ? crop
      : boundedCrop(
          cropFromPosition(source.width, source.height),
          source.width,
          source.height,
        )
    : null;
  const ink = dark ? "#F5F7FB" : "#121826",
    surface = dark ? "#202732" : "#FFFFFF";
  // The shell's client width excludes the browser scrollbar, as production layout does.
  const viewportWidth =
    Platform.OS === "web" && typeof document !== "undefined"
      ? document.getElementById("skoun-web-shell")?.clientWidth || width
      : width;
  const detail = detailPhotoFrame(
    width,
    height,
    Platform.OS !== "web",
    Math.max(1, photoCount + 1),
    viewportWidth,
  );
  const card =
    Platform.OS === "web"
      ? { width: 320, height: 320 / SEARCH_PHOTO_ASPECT }
      : {
          width: NATIVE_CARD_PHOTO_WIDTH,
          height: cardPhotoHeight(
            NATIVE_CARD_PHOTO_WIDTH,
            NATIVE_CARD_PHOTO_MIN_HEIGHT,
          ),
        };
  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;
    opener.current =
      controller.returnFocus.current ?? (document.activeElement as HTMLElement);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        queue.finish();
        return;
      }
      if (event.key !== "Tab") return;
      const el = dialog.current as unknown as HTMLElement;
      const controls = Array.from(
        el?.querySelectorAll<HTMLElement>("button,input,[tabindex]") ?? [],
      ).filter(
        (n) =>
          n.tabIndex >= 0 &&
          !n.hasAttribute("disabled") &&
          n.getAttribute("aria-disabled") !== "true" &&
          n.getClientRects().length,
      );
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (
        index < 0 ||
        (!event.shiftKey && index === controls.length - 1) ||
        (event.shiftKey && index === 0)
      ) {
        event.preventDefault();
        (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
      }
    };
    const blockDrop = (event: DragEvent) => event.preventDefault();
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("drop", blockDrop);
    document.addEventListener("dragover", blockDrop);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("drop", blockDrop);
      document.removeEventListener("dragover", blockDrop);
      setTimeout(() => {
        const target = opener.current?.isConnected
          ? opener.current
          : (document.querySelector<HTMLElement>(
              '[aria-label^="Add photos,"]',
            ) ?? document.getElementById("photo-step-heading"));
        target?.focus();
      }, 0);
    };
  }, [visible, queue]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={() => queue.finish()}
      statusBarTranslucent
      onShow={() => {
        if (Platform.OS === "web")
          (dialog.current as unknown as HTMLElement)
            ?.querySelector<HTMLElement>('[role="button"]')
            ?.focus();
      }}
    >
      <View
        style={[
          styles.overlay,
          desktop && {
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          },
        ]}
      >
        <Pressable
          testID="crop-backdrop"
          accessible={false}
          focusable={false}
          onPress={() => queue.finish()}
          style={[StyleSheet.absoluteFill, { backgroundColor: "#121826A8" }]}
        />
        <View
          ref={dialog}
          role="dialog"
          accessibilityViewIsModal
          accessibilityLabel="Crop photos"
          style={[
            styles.modal,
            {
              backgroundColor: surface,
              maxHeight: height - Math.max(16, insets.top),
              paddingBottom: Math.max(12, insets.bottom),
            },
            desktop && { maxWidth: 960, borderRadius: 24 },
          ]}
        >
          <View style={styles.header}>
            <LText
              accessibilityLiveRegion="polite"
              accessibilityRole="header"
              accessibilityLabel={`Crop ${state.position} of ${state.total}`}
              variant="subtitle"
              style={{ color: ink }}
            >
              Crop {state.position}/{state.total}
            </LText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close crop batch"
              accessibilityHint="Discards remaining uncropped photos. Saved crops stay."
              onPress={() => queue.finish()}
              style={[styles.button, { minWidth: 44 }]}
            >
              <Ionicons name="close" size={22} color={ink} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              gap: 14,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {state.notices.map((notice, i) => (
              <LText key={i} variant="caption" style={{ color: ink }}>
                {notice}
              </LText>
            ))}
            {source && activeCrop ? (
              <View
                style={{ flexDirection: desktop ? "row" : "column", gap: 24 }}
              >
                <View style={{ flex: desktop ? 2 : undefined, minWidth: 0 }}>
                  <PhotoCropper
                    key={source.uri}
                    source={source}
                    onCrop={onCrop}
                    disabled={state.phase === "saving"}
                  />
                </View>
                <View
                  style={{
                    flex: desktop ? 1 : undefined,
                    gap: 16,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={{
                      maxWidth:
                        Platform.OS === "web"
                          ? undefined
                          : NATIVE_CARD_PHOTO_WIDTH,
                    }}
                  >
                    <CropPreview
                      source={source}
                      crop={activeCrop}
                      frame={card}
                      label="Search card"
                    />
                  </View>
                  <CropPreview
                    source={source}
                    crop={activeCrop}
                    frame={detail}
                    label="Detail hero"
                    chrome
                  />
                </View>
              </View>
            ) : (
              <View style={{ minHeight: 240, justifyContent: "center" }}>
                <ActivityIndicator color="#2F6FED" />
                <LText style={{ textAlign: "center", color: ink }}>
                  Reading photo…
                </LText>
              </View>
            )}
            {state.error && (
              <LText
                accessibilityRole="alert"
                style={{ color: dark ? "#FFB4AB" : "#B42318" }}
              >
                {state.error}
              </LText>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Discards this photo and moves to the next, or closes if last."
              accessibilityState={{ disabled: state.phase !== "cropping" }}
              disabled={state.phase !== "cropping"}
              onPress={() => queue.discard()}
              style={styles.button}
            >
              <LText style={{ color: ink }}>Skip</LText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: state.phase !== "cropping" }}
              disabled={state.phase !== "cropping" || !activeCrop}
              onPress={() => activeCrop && void queue.save(activeCrop)}
              style={[
                styles.button,
                {
                  backgroundColor: "#2F6FED",
                  paddingHorizontal: 24,
                  opacity: state.phase === "cropping" ? 1 : 0.6,
                },
              ]}
            >
              <LText style={{ color: "white" }}>
                {state.phase === "saving" ? "Saving…" : "Save"}
              </LText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  modal: {
    width: "100%",
    flexShrink: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  button: {
    minHeight: 44,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
});
