import { useColorScheme } from "@/components/useColorScheme";
import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import {
  cropImagePlacement,
  type CropRect,
  type DecodedPhoto,
} from "@/lib/photoCropGeometry";
import { LText } from "@/components/lister/Typography";
export function CropPreview({
  source,
  crop,
  frame,
  label,
  chrome = false,
}: {
  source: DecodedPhoto;
  crop: CropRect;
  frame: { width: number; height: number };
  label: string;
  chrome?: boolean;
}) {
  const ink = useColorScheme() === "dark" ? "#F5F7FB" : "#121826";
  const [width, setWidth] = useState(0);
  const height = (width * frame.height) / frame.width;
  return (
    <View style={{ gap: 6 }}>
      <LText variant="caption" style={{ color: ink }}>
        {label}
      </LText>
      <View
        testID={`crop-preview-${chrome ? "detail" : "card"}`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          aspectRatio: frame.width / frame.height,
          overflow: "hidden",
          borderRadius: 12,
          backgroundColor: "#20242A",
        }}
      >
        {width > 0 && (
          <Image
            source={{ uri: source.uri }}
            contentFit="fill"
            transition={0}
            accessibilityLabel={`${label} crop preview`}
            style={{
              position: "absolute",
              ...cropImagePlacement(source, crop, { width, height }),
            }}
          />
        )}
        {chrome && (
          <View
            pointerEvents="none"
            accessible={false}
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor: "#121826AA",
            }}
          >
            <LText style={{ color: "white", fontSize: 11 }}>1 / 3</LText>
          </View>
        )}
      </View>
    </View>
  );
}
