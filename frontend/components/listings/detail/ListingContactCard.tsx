import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { ListingMoreMenu } from "@/components/listings/detail/ListingMoreMenu";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import { formatDistanceShort } from "@/lib/formatDistance";
import { nearbyCampusesForListing } from "@/lib/nearbyCampuses";
import { rentPriceType } from "@/lib/rentPriceType";
import { scrollToListingSection } from "@/lib/scrollToListingSection";
import type { Listing } from "@/types/listing";

type Ion = ComponentProps<typeof Ionicons>["name"];

type TocItem = {
  id: string;
  icon: Ion;
  title: string;
};

type Props = {
  listing: Listing;
  title: string;
  price: string;
  priceLabel: string;
  saved: boolean;
  linkCopied: boolean;
  canContact: boolean;
  canCall: boolean;
  onSave: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onCall: () => void;
  reported: boolean;
  onReport: () => void;
};

const IS_WEB = Platform.OS === "web";

function jumpToSection(id: string) {
  if (!IS_WEB) return;
  scrollToListingSection(id);
}

function TocRule() {
  return (
    <Svg
      width="100%"
      height={1}
      preserveAspectRatio="none"
      style={[styles.rowRule, IS_WEB ? ({ pointerEvents: "none" } as object) : null]}
    >
      <Line
        x1="0"
        y1={0.5}
        x2="100%"
        y2={0.5}
        stroke="#E5EAF1"
        strokeWidth={1}
        {...(IS_WEB ? ({ shapeRendering: "crispEdges" } as object) : null)}
      />
    </Svg>
  );
}

function listingToc(listing: Listing, hasNearby: boolean): TocItem[] {
  const items: TocItem[] = [];
  if (hasNearby) {
    items.push({
      id: "listing-campus",
      icon: "school-outline",
      title: "Near campus",
    });
  }
  items.push({
    id: "listing-utilities",
    icon: "flash-outline",
    title: "Utilities",
  });
  const hasRooms = Boolean(listing.pbsaRoomTypes?.length);
  items.push({
    id: "listing-unit",
    icon: hasRooms ? "bed-outline" : "home-outline",
    title: hasRooms ? "Rooms" : "The unit",
  });
  if (listing.description?.trim()) {
    items.push({
      id: "listing-about",
      icon: "document-text-outline",
      title: "About",
    });
  }
  items.push({
    id: "listing-amenities",
    icon: "grid-outline",
    title: "Amenities",
  });
  if (
    listing.cancellationPolicy?.trim() ||
    listing.houseRules?.some((rule) => rule.trim())
  ) {
    items.push({
      id: "listing-rules",
      icon: "shield-checkmark-outline",
      title: "House rules",
    });
  }
  if (listing.lat != null && listing.lng != null) {
    items.push({
      id: "listing-map",
      icon: "map-outline",
      title: "Map",
    });
  }
  return items;
}

export function ListingContactCard({
  listing,
  title,
  price,
  priceLabel,
  saved,
  linkCopied,
  canContact,
  canCall,
  onSave,
  onShare,
  onWhatsApp,
  onCall,
  reported,
  onReport,
}: Props) {
  const campuses = useUniversities();
  const nearby = nearbyCampusesForListing(listing, campuses.data ?? []);
  const nearest = nearby[0];
  const campusDist = formatDistanceShort(
    nearest?.meters ?? listing.distanceMeters,
  );
  const toc = listingToc(listing, nearby.length > 0);

  const banner = (() => {
    if (
      listing.reviewCount != null &&
      listing.reviewCount >= 1 &&
      listing.rating != null
    ) {
      return {
        icon: "star" as Ion,
        text: `${listing.rating.toFixed(1)} · ${listing.reviewCount} review${listing.reviewCount === 1 ? "" : "s"}`,
      };
    }
    if (nearest && campusDist) {
      return {
        icon: "location-outline" as Ion,
        text: `${campusDist} from ${nearest.name}`,
      };
    }
    if (listing.viewCount >= 5) {
      return {
        icon: "eye-outline" as Ion,
        text: `${listing.viewCount} views on this listing`,
      };
    }
    return {
      icon: "document-text-outline" as Ion,
      text: "No booking fee — you talk to the poster directly.",
    };
  })();

  return (
    <View style={styles.wrap}>
      <View style={styles.cardTop}>
        <View style={styles.head}>
          <View style={styles.headCopy}>
            <LText variant="subtitle" style={styles.title} numberOfLines={2}>
              {title}
            </LText>
            <LText variant="caption" tone="muted">
              {priceLabel}{" "}
              <LText variant="body" style={[rentPriceType, styles.priceInline]}>
                {price}
              </LText>
              <LText variant="caption" tone="muted">
                {" "}
                / month
              </LText>
            </LText>
          </View>
          <View style={styles.iconBtns}>
            <ListingMoreMenu
              linkCopied={linkCopied}
              reported={reported}
              onShare={onShare}
              onReport={onReport}
            />
            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={saved ? "Unsave listing" : "Save listing"}
              style={({ hovered }) => [
                styles.iconBtn,
                hovered && styles.iconBtnHover,
              ]}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={16}
                color={saved ? Skoun.color.danger : Skoun.color.ink}
              />
            </Pressable>
          </View>
        </View>

        {canCall ? (
          <Pressable
            onPress={onCall}
            accessibilityRole="button"
            accessibilityLabel="Call the poster"
            style={({ hovered, pressed }) => [
              styles.solid,
              (hovered || pressed) && styles.solidHover,
            ]}
          >
            <Ionicons name="call" size={17} color="#fff" />
            <LText variant="subtitle" style={styles.solidText}>
              Call
            </LText>
          </Pressable>
        ) : null}

        {canContact ? (
          <Pressable
            onPress={onWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp the poster"
            style={({ hovered, pressed }) => [
              canCall ? styles.outline : styles.solid,
              (hovered || pressed) &&
                (canCall ? styles.outlineHover : styles.solidHover),
            ]}
          >
            <Ionicons
              name="logo-whatsapp"
              size={17}
              color={canCall ? Skoun.color.primary : "#fff"}
            />
            <LText
              variant="subtitle"
              style={canCall ? styles.outlineText : styles.solidText}
            >
              WhatsApp
            </LText>
          </Pressable>
        ) : (
          <View style={[styles.outline, styles.disabled]}>
            <LText variant="subtitle" style={styles.outlineText}>
              WhatsApp soon
            </LText>
          </View>
        )}

        <View style={styles.banner}>
          <Ionicons name={banner.icon} size={15} color={Skoun.color.primary} />
          <LText variant="caption" style={styles.bannerText}>
            {banner.text}
          </LText>
        </View>
      </View>

      {toc.length > 0 ? (
        <View nativeID="listing-toc" style={styles.cardList}>
          {toc.map((item, i) => (
            <View key={item.id}>
              <Pressable
                onPress={() => jumpToSection(item.id)}
                accessibilityRole="link"
                accessibilityLabel={`View ${item.title}`}
                style={styles.row}
              >
                {({ hovered }) => (
                  <>
                    <View style={styles.rowIcon}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={Skoun.color.primary}
                      />
                    </View>
                    <LText variant="body" style={styles.rowTitle}>
                      {item.title}
                    </LText>
                    <LText
                      variant="caption"
                      accessibilityElementsHidden
                      style={[styles.hint, !hovered && styles.hintHidden]}
                    >
                      View
                    </LText>
                  </>
                )}
              </Pressable>
              {i < toc.length - 1 ? <TocRule /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {reported ? (
        <LText variant="caption" tone="muted">
          You reported this listing
        </LText>
      ) : null}
    </View>
  );
}

const CARD_SHADOW = IS_WEB
  ? ({
      boxShadow: "0 8px 24px rgba(18, 24, 38, 0.08)",
    } as object)
  : {
      shadowColor: "#121826",
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    };

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  cardTop: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    padding: 14,
    gap: 9,
    overflow: "visible",
    ...CARD_SHADOW,
  },
  cardList: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    zIndex: 8,
  },
  headCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.ink,
  },
  priceInline: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  iconBtns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flexShrink: 0,
    zIndex: 3,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#D9E0EA",
    alignItems: "center",
    justifyContent: "center",
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  iconBtnHover: {
    borderColor: Skoun.color.ink,
  },
  solid: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Skoun.color.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color",
          transitionDuration: "160ms",
        } as object)
      : null),
  },
  solidHover: { backgroundColor: "#1E5BD6" },
  solidText: {
    color: "#fff",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
  },
  outline: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  outlineHover: {
    borderColor: "#1E5BD6",
  },
  outlineText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
  },
  disabled: { opacity: 0.45 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Skoun.color.primaryMist,
  },
  bannerText: {
    flex: 1,
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 4,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  rowIcon: {
    width: 18,
    height: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rowRule: {
    width: "100%",
    height: 1,
  },
  rowTitle: {
    flex: 1,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  hint: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    opacity: 1,
    ...(IS_WEB
      ? ({
          transitionProperty: "opacity",
          transitionDuration: "200ms",
          transitionTimingFunction: "ease",
        } as object)
      : null),
  },
  hintHidden: {
    opacity: 0,
  },
});
