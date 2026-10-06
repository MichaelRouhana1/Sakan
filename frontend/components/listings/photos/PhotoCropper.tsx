import { useColorScheme } from "@/components/useColorScheme";
import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { LText } from "@/components/lister/Typography";
import {
  boundedCrop,
  clamp,
  cropFromPosition,
  cropImagePlacement,
  PHOTO_CROP_ASPECT,
} from "@/lib/photoCropGeometry";
import type { CropperProps } from "./PhotoCropper.types";
export function PhotoCropper({ source, onCrop, disabled }: CropperProps) {
  const ink = useColorScheme() === "dark" ? "#F5F7FB" : "#121826";
  const [width, setWidth] = useState(300);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5, zoom: 1 });
  const current = useRef(position);
  current.current = position;
  const start = useRef(position);
  const pinchStart = useRef(1);
  const rect = boundedCrop(
    cropFromPosition(
      source.width,
      source.height,
      position.zoom,
      position.x,
      position.y,
    ),
    source.width,
    source.height,
  );
  const placement = cropImagePlacement(source, rect, {
    width,
    height: width / PHOTO_CROP_ASPECT,
  });
  const left = useSharedValue(placement.left),
    top = useSharedValue(placement.top),
    imageWidth = useSharedValue(placement.width),
    imageHeight = useSharedValue(placement.height);
  useEffect(() => {
    left.value = placement.left;
    top.value = placement.top;
    imageWidth.value = placement.width;
    imageHeight.value = placement.height;
  }, [
    placement.left,
    placement.top,
    placement.width,
    placement.height,
    left,
    top,
    imageWidth,
    imageHeight,
  ]);
  const imageStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: left.value,
    top: top.value,
    width: imageWidth.value,
    height: imageHeight.value,
  }));
  useEffect(
    () => onCrop(rect),
    [rect.x, rect.y, rect.width, rect.height, onCrop],
  );
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .runOnJS(true)
    .onBegin(() => {
      start.current = current.current;
    })
    .onUpdate((e) => {
      const r = cropFromPosition(
        source.width,
        source.height,
        start.current.zoom,
      );
      const scale = width / r.width;
      setPosition((p) => ({
        ...p,
        x: clamp(
          start.current.x -
            e.translationX / Math.max(1, (source.width - r.width) * scale),
          0,
          1,
        ),
        y: clamp(
          start.current.y -
            e.translationY / Math.max(1, (source.height - r.height) * scale),
          0,
          1,
        ),
      }));
    });
  const pinch = Gesture.Pinch()
    .enabled(!disabled)
    .runOnJS(true)
    .onBegin(() => {
      pinchStart.current = current.current.zoom;
    })
    .onUpdate((e) =>
      setPosition((p) => ({
        ...p,
        zoom: clamp(pinchStart.current * e.scale, 1, 4),
      })),
    );
  const control = (label: string, text: string, action: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={action}
      style={{
        minWidth: 44,
        minHeight: 44,
        padding: 10,
        borderWidth: 1,
        borderColor: "#8B96A8",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LText style={{ color: ink }}>{text}</LText>
    </Pressable>
  );
  return (
    <View style={{ gap: 12 }}>
      <GestureHandlerRootView>
        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{
              width: "100%",
              aspectRatio: PHOTO_CROP_ASPECT,
              overflow: "hidden",
              borderRadius: 14,
              backgroundColor: "#161B23",
            }}
          >
            <Animated.View style={imageStyle}>
              <Image
                source={{ uri: source.uri }}
                contentFit="fill"
                style={{ width: "100%", height: "100%" }}
              />
            </Animated.View>
            <View
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={{ position: "absolute", inset: 0 }}
            >
              {[1, 2].map((n) => (
                <View
                  key={`v${n}`}
                  style={{
                    position: "absolute",
                    left: `${(n * 100) / 3}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: "#FFFFFF88",
                  }}
                />
              ))}
              {[1, 2].map((n) => (
                <View
                  key={`h${n}`}
                  style={{
                    position: "absolute",
                    top: `${(n * 100) / 3}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: "#FFFFFF88",
                  }}
                />
              ))}
            </View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      <LText variant="caption" style={{ color: ink }}>
        Drag to position. Pinch to zoom, or use the controls.
      </LText>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {control("Move crop left", "←", () =>
          setPosition((p) => ({ ...p, x: clamp(p.x - 0.05, 0, 1) })),
        )}
        {control("Move crop right", "→", () =>
          setPosition((p) => ({ ...p, x: clamp(p.x + 0.05, 0, 1) })),
        )}
        {control("Move crop up", "↑", () =>
          setPosition((p) => ({ ...p, y: clamp(p.y - 0.05, 0, 1) })),
        )}
        {control("Move crop down", "↓", () =>
          setPosition((p) => ({ ...p, y: clamp(p.y + 0.05, 0, 1) })),
        )}
        {control("Zoom out", "−", () =>
          setPosition((p) => ({ ...p, zoom: clamp(p.zoom - 0.1, 1, 4) })),
        )}
        {control("Zoom in", "+", () =>
          setPosition((p) => ({ ...p, zoom: clamp(p.zoom + 0.1, 1, 4) })),
        )}
        {control("Reset crop", "Reset", () =>
          setPosition({ x: 0.5, y: 0.5, zoom: 1 }),
        )}
      </View>
    </View>
  );
}
