import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { labelListingType } from "@/lib/listingLabels";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";
import type { Listing, PbsaRoomType } from "@/types/listing";

type Category = PbsaRoomType["category"];

const CAT_META: Record<
  Category,
  { title: string; desc: string }
> = {
  studio: {
    title: "Studio",
    desc: "All-in-one space with bedroom, private bathroom, living area, and kitchenette",
  },
  ensuite: {
    title: "Ensuite",
    desc: "A private room with its own bathroom",
  },
  shared_room: {
    title: "Shared room",
    desc: "Shared room for two students",
  },
  apartment: {
    title: "Apartment",
    desc: "Multi-room apartment with shared living and kitchen",
  },
};

const CAT_ORDER: Category[] = [
  "studio",
  "ensuite",
  "shared_room",
  "apartment",
];

type Props = {
  listing: Listing;
  posterPhone: string | null;
};

export function ListingDetailRooms({ listing, posterPhone }: Props) {
  const rooms = listing.pbsaRoomTypes ?? [];
  const grouped = useMemo(() => {
    const map: Record<Category, PbsaRoomType[]> = {
      studio: [],
      ensuite: [],
      shared_room: [],
      apartment: [],
    };
    rooms.forEach((r) => {
      const cat = r.category || "studio";
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    });
    return map;
  }, [rooms]);

  const [filter, setFilter] = useState<"all" | Category>("all");
  const canContact = hasUsableWhatsAppPhone(posterPhone);

  if (rooms.length === 0) return null;

  const pills: { id: "all" | Category; label: string }[] = [
    { id: "all", label: `All (${rooms.length})` },
    ...CAT_ORDER.filter((c) => grouped[c].length > 0).map((c) => ({
      id: c,
      label: `${CAT_META[c].title} (${grouped[c].length})`,
    })),
  ];

  const visibleCats = CAT_ORDER.filter((c) => {
    if (grouped[c].length === 0) return false;
    return filter === "all" || filter === c;
  });

  const openWhatsApp = () => {
    if (!posterPhone || !canContact) return;
    void Linking.openURL(
      buildWhatsAppListingUrl({
        phone: posterPhone,
        propertyType: labelListingType(listing.listingType),
        area: listing.area,
      }),
    );
  };

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        Room types ({rooms.length})
      </LText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        {pills.map((p) => {
          const on = filter === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setFilter(p.id)}
              style={[styles.pill, on && styles.pillOn]}
            >
              <LText
                variant="caption"
                style={[styles.pillText, on && styles.pillTextOn]}
              >
                {p.label}
              </LText>
            </Pressable>
          );
        })}
      </ScrollView>

      {visibleCats.map((cat) => (
        <View key={cat} style={styles.catBlock}>
          <LText variant="subtitle">{CAT_META[cat].title}</LText>
          <LText variant="caption" tone="muted">
            {CAT_META[cat].desc}
          </LText>
          {grouped[cat].map((room) => {
            const photos = room.photos?.length
              ? room.photos
              : listing.photos.slice(0, 2);
            return (
              <View key={room.id} style={styles.roomCard}>
                <LText variant="subtitle">{room.name}</LText>
                {photos.length > 0 ? (
                  <View style={styles.thumbs}>
                    {photos.slice(0, 2).map((p) => (
                      <Image
                        key={p.id}
                        source={{ uri: p.url }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    ))}
                  </View>
                ) : null}
                {room.availableFrom ? (
                  <View style={styles.avail}>
                    <LText variant="caption" style={styles.availText}>
                      Available from: {room.availableFrom}
                    </LText>
                  </View>
                ) : null}
                {room.description ? (
                  <LText variant="caption" tone="muted">
                    {room.description}
                  </LText>
                ) : null}
                <View style={styles.featGrid}>
                  <Feat
                    icon="cash-outline"
                    label={`From ${formatFreshUsd(room.monthlyRentUsd)}/mo`}
                  />
                  {room.sizeSqm ? (
                    <Feat icon="resize-outline" label={`${room.sizeSqm} sqm`} />
                  ) : null}
                  {room.floor ? (
                    <Feat icon="layers-outline" label={`Floor ${room.floor}`} />
                  ) : null}
                  {room.features.slice(0, 4).map((f) => (
                    <Feat key={f} icon="checkmark-outline" label={f} />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!canContact}
                  onPress={openWhatsApp}
                  style={[styles.book, !canContact && styles.bookOff]}
                >
                  <LText variant="subtitle" style={styles.bookText}>
                    {canContact ? "WhatsApp" : "WhatsApp soon"}
                  </LText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Feat({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.feat}>
      <Ionicons name={icon} size={14} color={Skoun.color.inkMuted} />
      <LText variant="caption" style={styles.featLabel} numberOfLines={1}>
        {label}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  heading: { fontSize: 18 },
  pills: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  pillOn: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primary,
  },
  pillText: {
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.ink,
  },
  pillTextOn: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  catBlock: { gap: 8, marginTop: 4 },
  roomCard: {
    gap: 10,
    padding: 12,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  thumbs: { flexDirection: "row", gap: 8 },
  thumb: {
    flex: 1,
    height: 88,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.bgWash,
  },
  avail: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#A4F4CF",
  },
  availText: {
    color: "#065F46",
    fontFamily: Skoun.type.bodySemi,
  },
  featGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feat: {
    width: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featLabel: { flex: 1, color: Skoun.color.ink },
  book: {
    marginTop: 4,
    backgroundColor: Skoun.color.primary,
    borderRadius: Skoun.radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  bookOff: { opacity: 0.45 },
  bookText: { color: Skoun.color.surface },
});
