import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { Skoun } from "@/constants/theme";
import { LText } from "@/components/lister/Typography";
import type { Listing } from "@/types/listing";

export type GalleryMode = "photos" | "map";

type Props = {
  listing: Listing;
  height: number;
  saved: boolean;
  savePending?: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  mode: GalleryMode;
  onModeChange: (mode: GalleryMode) => void;
};

function OverlayBtn({
  icon,
  label,
  onPress,
  selected,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        selected && styles.iconBtnSaved,
        pressed && styles.iconBtnPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={selected ? Skoun.color.danger : Skoun.color.ink}
      />
    </Pressable>
  );
}

export function ListingDetailGallery({
  listing,
  height,
  saved,
  savePending,
  onBack,
  onToggleSave,
  mode,
  onModeChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoTotal, setPhotoTotal] = useState(
    listing.photos.length || (listing.coverUrl ? 1 : 0),
  );
  const hasPin = listing.lat != null && listing.lng != null;
  const showModePill = hasPin;

  const share = async () => {
    const title = listing.pbsaBuildingName?.trim() || listing.area;
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/listing/${listing.id}`
        : undefined;
    const message = url ? `${title} — ${url}` : title;
    try {
      await Share.share(
        Platform.OS === "ios" && url
          ? { title, url, message: title }
          : { title, message },
      );
    } catch {
      // User cancelled.
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      {mode === "map" && hasPin ? (
        <ListingPinMap
          lat={listing.lat!}
          lng={listing.lng!}
          height={height}
          interactive={false}
        />
      ) : (
        <ListingGallery
          photos={listing.photos}
          coverUrl={listing.coverUrl}
          height={height}
          hideOverlays
          onIndexChange={(i, total) => {
            setPhotoIndex(i);
            setPhotoTotal(total);
          }}
        />
      )}

      <View
        style={[styles.topBar, { top: Math.max(insets.top, 8) + 8 }]}
        pointerEvents="box-none"
      >
        <OverlayBtn
          icon="chevron-back"
          label="Back"
          onPress={onBack}
        />
        <View style={styles.topRight}>
          <OverlayBtn icon="share-outline" label="Share listing" onPress={() => void share()} />
          <OverlayBtn
            icon={saved ? "heart" : "heart-outline"}
            label={saved ? "Remove from shortlist" : "Save to shortlist"}
            selected={saved}
            disabled={savePending}
            onPress={onToggleSave}
          />
        </View>
      </View>

      <View style={styles.bottomRow} pointerEvents="box-none">
        <View style={styles.dotsSlot}>
          {mode === "photos" && photoTotal > 1
            ? Array.from({ length: Math.min(photoTotal, 8) }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === photoIndex && styles.dotOn]}
                />
              ))
            : null}
        </View>

        {showModePill ? (
          <View style={styles.modePill} accessibilityRole="tablist">
            {(["photos", "map"] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={m === "photos" ? "Photos" : "Map"}
                  onPress={() => onModeChange(m)}
                  style={[styles.modeOpt, active && styles.modeOptOn]}
                >
                  <LText
                    variant="caption"
                    style={[styles.modeText, active && styles.modeTextOn]}
                  >
                    {m === "photos" ? "Photos" : "Map"}
                  </LText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.modePillSpacer} />
        )}

        <View style={styles.countSlot}>
          {mode === "photos" && photoTotal > 0 ? (
            <View style={styles.count}>
              <LText variant="caption" style={styles.countText}>
                {photoIndex + 1}/{photoTotal}
              </LText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: Skoun.color.bgWash,
  },
  topBar: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(197,205,216,0.85)",
  },
  iconBtnPressed: { transform: [{ scale: 0.94 }] },
  iconBtnSaved: {
    backgroundColor: "rgba(254,228,226,0.95)",
    borderColor: "rgba(180,35,24,0.25)",
  },
  bottomRow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dotsSlot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotOn: {
    width: 16,
    backgroundColor: Skoun.color.surface,
  },
  modePill: {
    flexDirection: "row",
    backgroundColor: "rgba(18,24,38,0.58)",
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  modePillSpacer: { flex: 0 },
  modeOpt: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeOptOn: { backgroundColor: Skoun.color.surface },
  modeText: {
    color: Skoun.color.surface,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
  },
  modeTextOn: { color: Skoun.color.ink },
  countSlot: {
    flex: 1,
    alignItems: "flex-end",
  },
  count: {
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
