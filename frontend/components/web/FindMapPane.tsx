import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingBrowseMap } from "@/components/listings/ListingBrowseMap";
import { Skoun } from "@/constants/theme";
import type { CampusMeta, Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  campuses: CampusMeta[];
  universityMode?: boolean;
  loading?: boolean;
  visible: boolean;
  onClose: () => void;
  /** Full-height split pane (map mode), not a fixed sidebar card. */
  fullHeight?: boolean;
  hoveredListingId?: string | null;
  hoverFlyListingId?: string | null;
  onHoverFlyComplete?: () => void;
  focusCampusSlug?: string | null;
};

/** Amber-style map pane: map fills the column; Close Map floats top-right. */
export function FindMapPane({
  listings,
  campuses,
  universityMode,
  loading,
  visible,
  onClose,
  fullHeight = false,
  hoveredListingId = null,
  hoverFlyListingId = null,
  onHoverFlyComplete,
  focusCampusSlug = null,
}: Props) {
  return (
    <View
      style={[
        styles.pane,
        fullHeight && styles.paneFull,
        !visible && styles.paneHidden,
      ]}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
    >
      {visible && !fullHeight ? (
        <View style={styles.header}>
          <LText variant="subtitle" style={styles.title}>
            Map
          </LText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close map"
            onPress={onClose}
            style={({ hovered }) => [
              styles.close,
              hovered && styles.closeHover,
            ]}
          >
            <Ionicons name="close" size={16} color={Skoun.color.inkMuted} />
            <LText variant="caption" style={styles.closeLabel}>
              Close map
            </LText>
          </Pressable>
        </View>
      ) : visible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close map"
          onPress={onClose}
          style={({ hovered }) => [
            styles.closeFloat,
            hovered && styles.closeFloatHover,
          ]}
        >
          <LText variant="caption" style={styles.closeFloatLabel}>
            Close Map
          </LText>
          <Ionicons name="close" size={14} color={Skoun.color.ink} />
        </Pressable>
      ) : null}
      <View style={[styles.mapWrap, fullHeight && styles.mapWrapFull]}>
        <ListingBrowseMap
          listings={listings}
          campuses={campuses}
          universityMode={universityMode}
          loading={loading}
          fillContainer={fullHeight}
          hoveredListingId={hoveredListingId}
          hoverFlyListingId={hoverFlyListingId}
          onHoverFlyComplete={onHoverFlyComplete}
          focusCampusSlug={focusCampusSlug}
          active={visible}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    width: 360,
    flexShrink: 0,
    backgroundColor: Skoun.color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
    maxHeight: "calc(100vh - 120px)" as unknown as number,
  },
  paneFull: {
    width: "100%" as unknown as number,
    flex: 1,
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
    maxHeight: "none" as unknown as number,
    height: "100%" as unknown as number,
    position: "relative",
    overflow: "hidden",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  title: {
    fontSize: 15,
    color: Skoun.color.ink,
  },
  close: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  closeHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  closeLabel: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  closeFloat: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    cursor: "pointer" as unknown as undefined,
  },
  closeFloatHover: {
    backgroundColor: "#F8FAFC",
  },
  closeFloatLabel: {
    color: "#1E293B",
    fontFamily: Skoun.type.bodyBold,
    fontSize: 12,
  },
  mapWrap: {
    height: 480,
    minHeight: 360,
  },
  mapWrapFull: {
    flex: 1,
    height: "100%" as unknown as number,
    width: "100%" as unknown as number,
    minHeight: 0,
    minWidth: 0,
    position: "relative",
    overflow: "hidden",
  },
  paneHidden: {
    position: "absolute",
    width: 640,
    height: 800,
    left: -10000,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
});
