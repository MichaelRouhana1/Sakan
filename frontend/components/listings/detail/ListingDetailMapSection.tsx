import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { CampusFormSelect } from "@/components/campus/CampusFormSelect";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { Studently } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import { listingMapCampuses } from "@/lib/nearbyCampuses";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  variant?: ListingDetailVariant;
};

const metersLabel = (meters: number) => `${Math.round(meters).toLocaleString("en-US")} m`;

export function ListingDetailMapSection({ listing, variant = "card" }: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const universities = useUniversities();
  const campuses = useMemo(
    () => listingMapCampuses({ lat: listing.lat, lng: listing.lng }, universities.data ?? []),
    [listing.lat, listing.lng, universities.data],
  );
  const listingKey = `${listing.id}:${listing.lat}:${listing.lng}`;
  const [selection, setSelection] = useState<{ listingKey: string; slug: string } | null>(null);
  const selected = (selection?.listingKey === listingKey
    ? campuses.find((campus) => campus.slug === selection.slug)
    : null) ?? campuses[0] ?? null;
  const options = useMemo(() => campuses.map((campus, index) => ({
    value: campus.slug,
    label: campus.displayName ?? campus.name,
    detail: `${metersLabel(campus.meters)} away${index === 0 ? " · Closest university" : ""}`,
    slug: campus.institutionSlug ?? campus.slug,
    logoUrl: campus.logoUrl,
  })), [campuses]);

  if (listing.lat == null || listing.lng == null) return null;
  const web = variant === "web";

  return (
    <View testID="listing-map-section" style={[web ? chrome.web : chrome.card, styles.gap]}>
      <LText variant="title" style={web ? chrome.webHeading : chrome.cardHeading}>
        Nearby locations and map
      </LText>
      {!selected ? (
        <View style={styles.status}>
          <Ionicons name="school-outline" size={designSize(18)} color={Studently.color.inkMuted} />
          <LText variant="caption" tone="muted" style={styles.statusText}>
            {universities.isPending ? "Finding universities nearby…" : universities.isError
              ? "Universities couldn’t be loaded." : "No university locations available yet."}
          </LText>
          {universities.isError ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Retry universities" onPress={() => void universities.refetch()}>
              <LText variant="caption" style={styles.retry}>Retry</LText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.mapClip}>
        <ListingPinMap
          lat={listing.lat}
          lng={listing.lng}
          campus={selected}
          height={designSize(web ? 400 : 280)}
          interactive
        />
        {selected ? (
          <View style={styles.mapFilter}>
            <CampusFormSelect
              label="University on map"
              value={selected.slug}
              options={options}
              searchable
              searchPlaceholder="Search universities or campuses"
              onChange={(slug) => setSelection({ listingKey, slug })}
              renderTrigger={({ onPress, expanded, disabled }) => (
                <Pressable
                  onPress={onPress}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel="Choose university on map"
                  accessibilityHint={`Showing ${selected.displayName ?? selected.name}`}
                  accessibilityState={{ expanded, disabled }}
                  style={({ hovered, pressed }) => [
                    styles.mapFilterButton,
                    (hovered || pressed || expanded) && styles.mapFilterButtonOn,
                  ]}
                >
                  <Ionicons name="school-outline" size={designSize(16)} color={Studently.color.ink} />
                  <LText variant="caption" style={styles.mapFilterLabel}>Universities</LText>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={designSize(12)} color={Studently.color.inkMuted} />
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Ionicons name="location" size={designSize(16)} color={Studently.color.primary} />
            <LText variant="caption">This listing</LText>
          </View>
          {selected ? (
            <View style={[styles.legendItem, styles.campusLegend]}>
              <Ionicons name="school" size={designSize(16)} color={Studently.color.ink} />
              <LText variant="caption" numberOfLines={2} style={styles.campusName}>{selected.displayName ?? selected.name}</LText>
            </View>
          ) : null}
        </View>
        {selected ? (
          <LText variant="caption" tone="muted" style={styles.note}>
            {metersLabel(selected.meters)} away{selected.slug === campuses[0]?.slug ? " · Closest university" : ""} · Straight-line distance
          </LText>
        ) : null}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  gap: { gap: 14 },
  mapClip: {
    position: "relative",
    borderRadius: Studently.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  mapFilter: { position: "absolute", top: 10, right: 49, zIndex: 4 },
  mapFilterButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    minHeight: 32, paddingHorizontal: 10,
    backgroundColor: Studently.color.surface, borderRadius: 6,
    borderWidth: 1, borderColor: Studently.color.border,
    boxShadow: "0 1px 4px rgba(0,0,0,0.18)", cursor: "pointer",
  },
  mapFilterButtonOn: { backgroundColor: Studently.color.surfaceMuted },
  mapFilterLabel: { fontFamily: Studently.type.bodySemi, fontSize: 12 },
  footer: { gap: 8 },
  legend: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 18 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  campusLegend: { flex: 1, minWidth: 0 },
  campusName: { flex: 1, minWidth: 0 },
  note: { fontSize: 11, lineHeight: 16 },
  status: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12, backgroundColor: Studently.color.surfaceMuted,
  },
  statusText: { flex: 1 },
  retry: { color: Studently.color.primary, fontFamily: Studently.type.bodySemi },
});
