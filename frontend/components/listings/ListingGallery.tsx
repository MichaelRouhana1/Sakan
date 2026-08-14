import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import type { ListingPhoto } from "@/types/listing";

type Props = {
  photos: ListingPhoto[];
  coverUrl?: string | null;
  height?: number;
  /** Hide built-in dots/counter when a parent draws its own chrome. */
  hideOverlays?: boolean;
  onIndexChange?: (index: number, total: number) => void;
};

export function ListingGallery({
  photos,
  coverUrl,
  height = 320,
  hideOverlays = false,
  onIndexChange,
}: Props) {
  const { width } = useWindowDimensions();
  const urls =
    photos.length > 0
      ? photos.map((p) => p.url)
      : coverUrl
        ? [coverUrl]
        : [];
  const [index, setIndex] = useState(0);
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    },
  ).current;

  useEffect(() => {
    onIndexChange?.(index, urls.length);
  }, [index, urls.length, onIndexChange]);

  if (urls.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <LinearGradient
          colors={[Skoun.color.bgWash, Skoun.color.primaryMist]}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons
          name="image-outline"
          size={36}
          color={Skoun.color.inkFaint}
        />
        <LText variant="caption" tone="faint">
          No photos yet
        </LText>
      </View>
    );
  }

  return (
    <View style={[{ touchAction: "pan-x" } as any, styles.wrap, { height }]}>
      <FlatList
        data={urls}
        extraData={width}
        key={width}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        directionalLockEnabled
        nestedScrollEnabled
        pagingEnabled
        style={[{ touchAction: "pan-x" } as any]}
        showsHorizontalScrollIndicator={false}
        bounces={urls.length > 1}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            contentFit="cover"
            transition={180}
            accessibilityLabel="Listing photo"
          />
        )}
      />
      <LinearGradient
        colors={["rgba(18,24,38,0.35)", "transparent", "rgba(18,24,38,0.25)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {hideOverlays ? null : urls.length > 1 ? (
        <View style={styles.dots} accessibilityRole="adjustable">
          {urls.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotOn]}
              accessibilityLabel={
                i === index ? `Photo ${i + 1} of ${urls.length}` : undefined
              }
            />
          ))}
        </View>
      ) : null}
      {hideOverlays ? null : (
        <View style={styles.count}>
          <LText variant="caption" style={styles.countText}>
            {index + 1}/{urls.length}
          </LText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: Skoun.color.bgWash,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ touchAction: "pan-x" } as any) : {}),
  },
  placeholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Skoun.color.bgWash,
  },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotOn: {
    width: 18,
    backgroundColor: Skoun.color.surface,
  },
  count: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(18,24,38,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Skoun.radius.pill,
  },
  countText: {
    color: Skoun.color.surface,
    fontFamily: Skoun.type.bodySemi,
  },
});
