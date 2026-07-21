import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import type { ListingPhoto } from "@/types/listing";

const WIDTH = Dimensions.get("window").width;

type Props = {
  photos: ListingPhoto[];
  coverUrl?: string | null;
  height?: number;
};

export function ListingGallery({ photos, coverUrl, height = 320 }: Props) {
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
    <View style={[styles.wrap, { height }]}>
      <FlatList
        data={urls}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={urls.length > 1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
          setIndex(next);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: WIDTH, height }}
            contentFit="cover"
            transition={180}
            accessibilityLabel="Listing photo"
          />
        )}
      />
      <LinearGradient
        colors={["rgba(20,36,30,0.35)", "transparent", "rgba(20,36,30,0.25)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {urls.length > 1 ? (
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
      <View style={styles.count}>
        <LText variant="caption" style={styles.countText}>
          {index + 1}/{urls.length}
        </LText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: Skoun.color.bgWash,
    overflow: "hidden",
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
    backgroundColor: "rgba(20,36,30,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Skoun.radius.pill,
  },
  countText: {
    color: Skoun.color.surface,
    fontFamily: Skoun.type.bodySemi,
  },
});
