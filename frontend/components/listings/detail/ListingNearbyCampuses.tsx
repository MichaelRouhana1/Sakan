import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import { formatDistanceShort } from "@/lib/formatDistance";
import { nearbyCampusesForListing } from "@/lib/nearbyCampuses";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  onViewMap?: () => void;
  heading?: string;
};

export function ListingNearbyCampuses({
  listing,
  onViewMap,
  heading = "Near campus",
}: Props) {
  const campuses = useUniversities();
  const rows = useMemo(
    () => nearbyCampusesForListing(listing, campuses.data ?? []),
    [listing, campuses.data],
  );

  if (rows.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <LText variant="title" style={styles.heading}>
          {heading}
        </LText>
        {onViewMap ? (
          <Pressable
            onPress={onViewMap}
            accessibilityRole="link"
            accessibilityLabel="Jump to map"
          >
            <LText variant="caption" style={styles.jump}>
              View map
            </LText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.list}>
        {rows.map((row, i) => {
          const dist = formatDistanceShort(row.meters);
          const rowStyle = [styles.row, i === rows.length - 1 && styles.rowLast];
          const inner = (
            <>
              <InstitutionLogo
                shortName={row.shortName}
                slug={row.institutionSlug}
                logoUrl={row.logoUrl}
                size={28}
              />
              <LText variant="body" style={styles.name} numberOfLines={1}>
                {row.name}
              </LText>
              {dist ? (
                <LText variant="caption" tone="muted" style={styles.dist}>
                  {dist}
                </LText>
              ) : null}
            </>
          );
          if (onViewMap) {
            return (
              <Pressable
                key={row.campusSlug}
                onPress={onViewMap}
                accessibilityRole="link"
                accessibilityLabel={dist ? `${row.name}, ${dist}` : row.name}
                style={[
                  styles.row,
                  i === rows.length - 1 && styles.rowLast,
                  Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null,
                ]}
              >
                {inner}
              </Pressable>
            );
          }
          return (
            <View key={row.campusSlug} style={rowStyle}>
              {inner}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Skoun.type.bodyBold,
  },
  jump: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 22,
    color: Skoun.color.ink,
  },
  dist: {
    flexShrink: 0,
    fontSize: 13,
  },
});
