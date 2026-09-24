import { MatchCardChrome } from "@/components/matcher/MatchResults";
import type { MatchPresentation } from "@/features/matcher/types";
import { skounShadow } from "@/lib/skounShadow";
import { Ionicons } from "@expo/vector-icons";
import { MapPin } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ListingAmberPillView } from "@/components/listings/ListingAmberPill";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
import {
  ListingFeatureBadge,
  ListingGridRatingBadge,
  ListingListRatingDisplay,
  listingImageCornerBadge,
} from "@/components/listings/ListingRatingBadge";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import {
  formatCampusWalkLine,
  isHighlightCardBadge,
  listingAmberPillGroups,
  listingCardPills,
  listingCardSubtitle,
  listingCardTitle,
  type ListingAmberPill,
} from "@/lib/listingCardMeta";
import { GRID_TAG_LIMIT } from "@/lib/listingCardBadges";
import { labelListingType } from "@/lib/listingLabels";
import { resolveMediaUrls } from "@/lib/mediaUrl";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import type { Listing } from "@/types/listing";

type HoverPoint = { x: number; y: number };

type Props = {
  match?: MatchPresentation;
  listing: Listing;
  variant?: "grid" | "list";
  onHoverListing?: (id: string | null, point?: HoverPoint) => void;
  /** When false, card is a preview: no navigation, no save. */
  interactive?: boolean;
  /** Wizard editor replaces only the grid's badge area. */
  renderGridBadges?: (pills: ListingAmberPill[]) => ReactNode;
  /** Wizard list preview replaces the list badge rows. Explore leaves this unset. */
  renderListBadges?: (pills: ListingAmberPill[]) => ReactNode;
  /** Grid badge row. Explore wraps; the wizard grid preview scrolls sideways. */
  badgeOverflow?: "wrap" | "scroll-x";
  /**
   * Grid only. Omit to keep the browse cap. Pass null to show the full ordered set.
   */
  badgeLimit?: number | null;
  /** Wrap badges, then stop the band after this many rows. Further badges scroll inside it. */
  badgeMaxRows?: number;
};

/** Matches the list and compact grid pill metrics, including the row gap. */
export function badgeBandMaxHeight(rows: number, compact = false): number {
  const row = compact ? 26 : 30;
  const gap = compact ? 5 : 6;
  return row * rows + gap * Math.max(0, rows - 1);
}

function hoverPointFromEvent(e: { nativeEvent?: { clientX?: number; clientY?: number }; clientX?: number; clientY?: number }): HoverPoint | undefined {
  const src = e.nativeEvent ?? e;
  if (typeof src.clientX !== "number" || typeof src.clientY !== "number") {
    return undefined;
  }
  return { x: src.clientX, y: src.clientY };
}

const CARD_BORDER = "#E2E8F0";
/** Minimum grid body height; six badges may wrap onto additional rows. */
const GRID_BODY_HEIGHT = 143;
const GRID_HEADER_MIN_HEIGHT = 38;
const GRID_PROXIMITY_HEIGHT = 15;
const GRID_PILL_SLOT_MIN_HEIGHT = 49;

function photoUrls(listing: Listing): string[] {
  const fromPhotos = (listing.photos ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.url)
    .filter(Boolean);
  if (fromPhotos.length > 0) return resolveMediaUrls(fromPhotos);
  return resolveMediaUrls(listing.coverUrl ? [listing.coverUrl] : []);
}

function HeartButton({
  isSaved,
  onToggle,
  style,
  disabled = false,
}: {
  isSaved: boolean;
  onToggle: () => void;
  style?: object;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
      hitSlop={8}
      onPress={(e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        onToggle();
      }}
      onPressIn={(e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      }}
      style={style}
    >
      <Ionicons
        name={isSaved ? "heart" : "heart-outline"}
        size={20}
        color={isSaved ? "#C23B2E" : "#475569"}
      />
    </Pressable>
  );
}

function PillChips({
  pills,
  highlight,
  compact,
  mixedHighlight,
  nowrap,
}: {
  pills: ListingAmberPill[];
  highlight?: boolean;
  compact?: boolean;
  mixedHighlight?: boolean;
  nowrap?: boolean;
}) {
  return pills.map((pill) => (
    <ListingAmberPillView
      key={pill.key}
      pill={pill}
      highlight={mixedHighlight ? isHighlightCardBadge(pill.key) : highlight}
      compact={compact}
      style={[
        compact ? styles.tagCompactOverride : styles.tagOverride,
        nowrap && styles.tagNoShrink,
      ]}
      textStyle={compact ? styles.tagTextCompact : styles.tagText}
    />
  ));
}

function ScrollBadgeRow({
  pills,
  highlight,
  compact,
  mixedHighlight,
}: {
  pills: ListingAmberPill[];
  highlight?: boolean;
  compact?: boolean;
  mixedHighlight?: boolean;
}) {
  const width = useRef(0);
  const contentWidth = useRef(0);
  const [overflows, setOverflows] = useState(false);

  function check(nextWidth = width.current, nextContent = contentWidth.current) {
    width.current = nextWidth;
    contentWidth.current = nextContent;
    setOverflows(nextContent > nextWidth + 1);
  }

  return (
    <View style={styles.scrollClip}>
      <ScrollView
        horizontal
        testID="grid-badge-scroller"
        showsHorizontalScrollIndicator
        style={styles.badgeScroller}
        contentContainerStyle={styles.badgeScrollerContent}
        onLayout={(event) => check(event.nativeEvent.layout.width, contentWidth.current)}
        onContentSizeChange={(w) => check(width.current, w)}
      >
        <View style={styles.badgeRowNowrap}>
          <PillChips
            pills={pills}
            highlight={highlight}
            compact={compact}
            mixedHighlight={mixedHighlight}
            nowrap
          />
        </View>
      </ScrollView>
      {overflows ? (
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#FFFFFF"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.scrollFade}
        />
      ) : null}
    </View>
  );
}

function PillRow({
  pills,
  highlight,
  compact,
  mixedHighlight,
  overflow = "wrap",
  maxRows,
}: {
  pills: ListingAmberPill[];
  highlight?: boolean;
  compact?: boolean;
  mixedHighlight?: boolean;
  overflow?: "wrap" | "scroll-x";
  maxRows?: number;
}) {
  if (pills.length === 0) return null;
  const chips = (
    <PillChips
      pills={pills}
      highlight={highlight}
      compact={compact}
      mixedHighlight={mixedHighlight}
    />
  );
  if (maxRows) {
    return (
      <ScrollView
        testID="grid-badge-scroller"
        style={{ maxHeight: badgeBandMaxHeight(maxRows, !!compact), width: "100%" }}
        nestedScrollEnabled
      >
        <View style={[styles.tags, compact && styles.tagsCompact]}>{chips}</View>
      </ScrollView>
    );
  }
  if (overflow === "scroll-x") {
    return (
      <ScrollBadgeRow
        pills={pills}
        highlight={highlight}
        compact={compact}
        mixedHighlight={mixedHighlight}
      />
    );
  }
  return (
    <View style={[styles.tags, compact && styles.tagsCompact]}>
      {chips}
    </View>
  );
}

function ImageCornerBadge({
  listing,
  variant = "grid",
}: {
  listing: Listing;
  variant?: "grid" | "list";
}) {
  const badge = listingImageCornerBadge(listing, variant);
  if (!badge) return null;
  if (badge.kind === "rating") {
    return (
      <ListingGridRatingBadge
        rating={badge.rating!}
        reviewCount={badge.reviewCount!}
      />
    );
  }
  return <ListingFeatureBadge label={badge.label!} />;
}

function GridCardBody({ interactive, onOpen, label, children }: {
  interactive: boolean;
  onOpen: () => void;
  label: string;
  children: ReactNode;
}) {
  // Preview controls must not be nested inside a clickable card body.
  if (!interactive) return <View style={styles.gridBody}>{children}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onOpen}
      style={({ hovered, pressed }) => [styles.gridBody, (hovered || pressed) && styles.cardHover]}>
      {children}
    </Pressable>
  );
}

export function ListingResultCard({
  listing,
  variant = "grid",
  onHoverListing,
  interactive = true,
  renderGridBadges,
  renderListBadges,
  badgeOverflow = "wrap",
  badgeLimit,
  badgeMaxRows,
  match,
}: Props) {
  const router = useRouter();
  const isList = variant === "list";
  const coarsePointer = useCoarsePointer();
  const [listHovered, setListHovered] = useState(false);
  const touchPanX =
    Platform.OS === "web" && coarsePointer
      ? ({ touchAction: "pan-x" } as object)
      : null;
  const mapHoverHandlers =
    onHoverListing && Platform.OS === "web"
      ? {
          onMouseEnter: (e: { nativeEvent?: { clientX?: number; clientY?: number }; clientX?: number; clientY?: number }) =>
            onHoverListing(listing.id, hoverPointFromEvent(e)),
          onMouseLeave: () => onHoverListing(null),
        }
      : {};
  const title = listingCardTitle(listing);
  const subtitle = listingCardSubtitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const proximity = formatCampusWalkLine(
    listing.distanceMeters,
    listing.nearestCampusName,
  );
  const allowedPill = (pill: ListingAmberPill) => !match || !['solar','power_24','cuts','wifi','ups_wifi','water_24','tank','elevator'].includes(pill.key) || !!listing.matchFacts?.reportedUtilityKeys?.includes(pill.key);
  const badgeListing = match ? {...listing, routerUps: !!listing.matchFacts?.reportedUtilityKeys?.includes("ups_wifi")} : listing;
  const groups = listingAmberPillGroups(badgeListing);
  const highlights = groups.highlights.filter(allowedPill);
  const amenities = groups.amenities.filter(allowedPill);
  const customized = listing.cardBadges != null;
  const orderedPills = listingCardPills(badgeListing).filter(allowedPill);
  const typeBadge = labelListingType(listing.listingType);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();
  const urls = photoUrls(listing);
  const onOpen = () => {
    if (!interactive) return;
    router.push(`/(renter)/listing/${listing.id}`);
  };
  const onToggleSave = () => {
    if (!interactive) return;
    toggleSaved.mutate(listing);
  };

  const hasRating =
    (listing.reviewCount ?? 0) > 0 &&
    listing.rating != null &&
    Number.isFinite(listing.rating);

  if (isList) {
    const listHoverProps =
      Platform.OS === "web"
        ? ({
            onMouseEnter: (
              e: Parameters<typeof hoverPointFromEvent>[0],
            ) => {
              setListHovered(true);
              onHoverListing?.(listing.id, hoverPointFromEvent(e));
            },
            onMouseLeave: () => {
              setListHovered(false);
              onHoverListing?.(null);
            },
          } as object)
        : mapHoverHandlers;
    const listDetails = (
      <>
        <View style={[styles.middle, styles.middleList]}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {subtitle}
            {listing.landmark ? ` · ${typeBadge}` : ""}
          </Text>

          {proximity ? (
            <View style={styles.proximityRow}>
              <MapPin size={12} color={Skoun.color.inkMuted} strokeWidth={2} />
              <Text style={styles.proximityText} numberOfLines={2}>
                {proximity}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {renderListBadges ? (
            renderListBadges(customized ? orderedPills : [...highlights, ...amenities])
          ) : customized ? (
            <PillRow pills={orderedPills} highlight={false} mixedHighlight />
          ) : (
            <>
              <PillRow pills={highlights} highlight />
              <PillRow pills={amenities} />
            </>
          )}
        </View>

        <View style={[styles.rightCol, styles.rightColList]}>
          <View style={styles.listHeaderRow}>
            {hasRating ? (
              <ListingListRatingDisplay
                rating={listing.rating!}
                reviewCount={listing.reviewCount!}
              />
            ) : (
              <View />
            )}
            <HeartButton
              isSaved={interactive && isSaved}
              onToggle={onToggleSave}
              style={styles.heart}
              disabled={!interactive}
            />
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceFrom}>From</Text>
            <Text style={styles.price}>
              {rentLabel}
              <Text style={styles.priceUnit}> / month</Text>
            </Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>View Listing</Text>
            </View>
          </View>
        </View>
      </>
    );
    return (
      <View
        style={[
          styles.card,
          styles.cardList,
          match?.top && styles.matchTop,
          Platform.OS === "web" && styles.listHoverShell,
          Platform.OS === "web" && listHovered && styles.listHoverShellActive,
        ]}
        {...listHoverProps}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              styles.listBottomShadowWindow,
              listHovered && styles.listBottomGlowOn,
              { pointerEvents: "none" },
            ]}
          >
            <View style={styles.listBottomShadowShape} />
          </View>
        ) : null}
        <View style={styles.listClip}>
          <View style={[touchPanX, styles.mediaShell, styles.mediaList]}>
            <ListingCardCarousel
              urls={urls}
              onPressCard={onOpen}
              minHeight={220}
              fill
            />
            <ImageCornerBadge listing={listing} variant="list" />
          </View>

          {renderListBadges ? (
            <View style={styles.listBodyContent}>{listDetails}</View>
          ) : (
            <Pressable
              accessibilityRole={interactive ? "link" : undefined}
              accessibilityLabel={`${title}, ${rentLabel} per month`}
              disabled={!interactive}
              onPress={onOpen}
              style={styles.listBodyContent}
            >
              {listDetails}
            </Pressable>
          )}
        </View>
        {match ? <MatchCardChrome match={match} /> : null}
      </View>
    );
  }

  // ── Grid (vertical Amber card) ───────────────────────────────────
  const gridSource = customized ? orderedPills : [...highlights, ...amenities];
  const gridPills = badgeLimit === null
    ? gridSource
    : gridSource.slice(0, badgeLimit ?? GRID_TAG_LIMIT);
  const metaLine = [subtitle, typeBadge].filter(Boolean).join(" · ");

  return (
    <View style={[styles.card, styles.cardGrid, match?.top && styles.matchTop]} {...mapHoverHandlers}>
      <View testID="listing-grid-media" style={[touchPanX, styles.gridMedia]}>
        <ListingCardCarousel urls={urls} onPressCard={onOpen} />

        <HeartButton
          isSaved={interactive && isSaved}
          onToggle={onToggleSave}
          style={styles.gridHeart}
          disabled={!interactive}
        />

        <ImageCornerBadge listing={listing} variant="grid" />
      </View>

      <GridCardBody interactive={interactive} onOpen={onOpen} label={`${title}, ${rentLabel} per month`}>
        <View style={styles.gridHeader}>
          <View style={styles.gridHeaderLeft}>
            <Text style={styles.gridTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.gridMeta} numberOfLines={1}>
              {metaLine}
            </Text>
          </View>
          <View style={styles.gridPriceCol}>
            <Text style={styles.gridFrom}>From</Text>
            <Text style={styles.gridPrice}>
              {rentLabel}
              <Text style={styles.gridPriceUnit}>/month</Text>
            </Text>
          </View>
        </View>

        <View style={styles.gridProximitySlot}>
          <View
            style={[
              styles.gridProximityRow,
              !proximity && styles.gridProximityHidden,
            ]}
            aria-hidden={!proximity}
            importantForAccessibility={proximity ? "yes" : "no-hide-descendants"}
          >
            {proximity ? (
              <MapPin size={11} color={Skoun.color.inkMuted} strokeWidth={2} />
            ) : null}
            <Text style={styles.gridProximity} numberOfLines={1}>
              {proximity ?? "\u00A0"}
            </Text>
          </View>
        </View>

        <View style={styles.gridDivider} />

        <View style={[
          styles.gridPillSlot,
          badgeOverflow === "scroll-x" && !badgeMaxRows && styles.gridPillSlotFixed,
          badgeMaxRows ? { maxHeight: badgeBandMaxHeight(badgeMaxRows, true), overflow: "hidden" } : null,
        ]}>
          {renderGridBadges ? renderGridBadges(gridPills) : (
            <PillRow
              pills={gridPills}
              compact
              overflow={badgeOverflow}
              maxRows={badgeMaxRows}
            />
          )}
        </View>
      </GridCardBody>
      {match ? <MatchCardChrome match={match} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  matchTop: {borderColor: Skoun.color.primarySoft, ...skounShadow({blur:20,y:5,opacity:.1,elevation:3})},
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  listBodyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardList: {
    alignSelf: "stretch",
    minHeight: 220,
    overflow: "visible",
  },
  listClip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 220,
    overflow: "hidden",
    borderRadius: 15,
  },
  listHoverShell: {
    position: "relative",
  },
  listHoverShellActive: {
    zIndex: 1,
  },
  listBottomShadowWindow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -8,
    height: 24,
    overflow: "hidden",
    opacity: 0,
    transitionProperty: "opacity",
    transitionDuration: "220ms",
    transitionTimingFunction: "ease-in",
  },
  listBottomShadowShape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: Skoun.color.surface,
    boxShadow: "0 3px 8px rgba(18, 24, 38, 0.28)",
  },
  listBottomGlowOn: {
    opacity: 1,
  },
  cardGrid: {
    flexDirection: "column",
    alignSelf: "stretch",
  },
  cardHover: {
    boxShadow: "0 6px 12px rgba(18, 24, 38, 0.1)",
  },
  mediaShell: {
    position: "relative",
    flexShrink: 0,
    alignSelf: "stretch",
    alignItems: "stretch",
    overflow: "hidden",
  },
  mediaList: {
    width: 280,
    minHeight: 220,
    alignSelf: "stretch",
  },
  middle: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
    justifyContent: "flex-start",
  },
  middleList: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    color: Skoun.color.ink,
    letterSpacing: -0.25,
  },
  meta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  proximityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 2,
  },
  proximityText: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
    lineHeight: 17,
  },
  divider: {
    marginTop: 8,
    marginBottom: 2,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagsCompact: {
    gap: 5,
    marginTop: 0,
  },
  tagOverride: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tagCompactOverride: {
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  tagText: {
    fontSize: 12,
  },
  tagTextCompact: {
    fontSize: 11,
  },
  rightCol: {
    backgroundColor: "#FFFFFF",
    width: 148,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: CARD_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  rightColList: {
    width: 185,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    width: "100%",
  },
  heart: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  heartGlyph: {
    fontSize: 18,
    color: Skoun.color.inkMuted,
  },
  heartOn: {
    color: Skoun.color.primary,
  },
  priceBlock: {
    gap: 4,
    alignItems: "stretch",
  },
  priceFrom: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkFaint,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.inkMuted,
  },
  cta: {
    marginTop: 10,
    backgroundColor: Skoun.color.primary,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Grid — Amber density (~40% image, tight body, compact pills)
  gridMedia: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    backgroundColor: Skoun.color.primaryMist,
    ...(Platform.OS === "web"
      ? ({ clipPath: "inset(0)", WebkitClipPath: "inset(0)" } as object)
      : null),
  },
  gridHeart: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    boxShadow: "0 2px 6px rgba(18, 24, 38, 0.12)",
  },
  gridBody: {
    backgroundColor: "#FFFFFF",
    minHeight: GRID_BODY_HEIGHT,
    flexShrink: 0,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    minHeight: GRID_HEADER_MIN_HEIGHT,
  },
  gridHeaderLeft: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 4,
  },
  gridTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    lineHeight: 21,
    color: Skoun.color.ink,
    letterSpacing: -0.15,
  },
  gridMeta: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  gridPriceCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    paddingTop: 1,
  },
  gridFrom: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 14,
    color: Skoun.color.inkFaint,
  },
  gridPrice: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    lineHeight: 21,
    color: Skoun.color.ink,
    letterSpacing: -0.2,
  },
  gridPriceUnit: {
    fontSize: 11,
    fontFamily: Skoun.type.body,
    color: Skoun.color.inkMuted,
  },
  gridProximity: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 15,
    color: Skoun.color.inkMuted,
  },
  gridProximityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gridProximitySlot: {
    height: GRID_PROXIMITY_HEIGHT,
    justifyContent: "center",
  },
  gridProximityHidden: {
    opacity: 0,
  },
  gridDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
    alignSelf: "stretch",
  },
  gridPillSlot: {
    minHeight: GRID_PILL_SLOT_MIN_HEIGHT,
    justifyContent: "flex-start",
  },
  gridPillSlotFixed: {
    height: GRID_PILL_SLOT_MIN_HEIGHT,
    maxHeight: GRID_PILL_SLOT_MIN_HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
  },
  scrollClip: {
    height: GRID_PILL_SLOT_MIN_HEIGHT,
    justifyContent: "center",
    position: "relative",
  },
  badgeScroller: {
    flexGrow: 0,
  },
  badgeScrollerContent: {
    alignItems: "center",
  },
  badgeRowNowrap: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 5,
  },
  scrollFade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 28,
    pointerEvents: "none",
  },
  tagNoShrink: {
    flexShrink: 0,
  },
});
