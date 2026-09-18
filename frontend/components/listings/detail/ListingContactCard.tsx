import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ListingMoreMenu } from "@/components/listings/detail/ListingMoreMenu";
import { ListingMoneyStack } from "@/components/listings/detail/ListingMoneyStack";
import { ListingTocRail, type ListingTocItem } from "@/components/listings/detail/ListingTocRail";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import { labelPosterRole } from "@/lib/listingLabels";
import { nearbyCampusesForListing } from "@/lib/nearbyCampuses";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

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

function listingToc(listing: Listing, hasNearby: boolean): ListingTocItem[] {
  const items: ListingTocItem[] = [];
  items.push({
    id: "listing-utilities",
    icon: "flash-outline",
    title: "Utilities",
  });
  if (hasNearby) {
    items.push({
      id: "listing-campus",
      icon: "school-outline",
      title: "Near campus",
    });
  }
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

function hostInitial(name: string | null): string {
  const letter = name?.trim().charAt(0);
  return letter ? letter.toUpperCase() : "H";
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
  const toc = listingToc(listing, nearby.length > 0);

  const role = listing.listingPosterRole
    ? labelPosterRole(listing.listingPosterRole)
    : null;
  const contactName = listing.contactName?.trim() || null;
  const hostCaption = [role, "No booking fee"].filter(Boolean).join(" · ");
  const showFrom = priceLabel.toLowerCase() === "from";
  const hasRating =
    listing.reviewCount != null &&
    listing.reviewCount >= 1 &&
    listing.rating != null;

  return (
    <View style={styles.wrap}>
      <View style={styles.cardTop}>
        <View style={styles.head}>
          <LText variant="subtitle" style={styles.title} numberOfLines={2}>
            {title}
          </LText>
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

        <View style={styles.ticket}>
          <View style={styles.ticketRail} />
          <View style={styles.ticketBody}>
            {showFrom ? (
              <LText variant="caption" style={styles.fareKicker}>
                From
              </LText>
            ) : null}
            <View style={styles.fareRow}>
              <LText variant="body" style={[rentPriceType, styles.fareAmt]}>
                {price}
              </LText>
              <LText variant="caption" style={styles.fareUnit}>
                / month
              </LText>
            </View>
            <View style={styles.ticketSplit} />
            <ListingMoneyStack listing={listing} layout="ledger" />
          </View>
        </View>

        <View style={styles.actions}>
          {canContact ? (
            <Pressable
              onPress={onWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp the poster"
              style={({ hovered, pressed }) => [
                styles.solid,
                (hovered || pressed) && styles.solidHover,
              ]}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <LText variant="subtitle" style={styles.solidText}>
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

          {canCall ? (
            <Pressable
              onPress={onCall}
              accessibilityRole="button"
              accessibilityLabel="Call the poster"
              style={({ hovered, pressed }) => [
                canContact ? styles.outline : styles.solid,
                (hovered || pressed) &&
                  (canContact ? styles.outlineHover : styles.solidHover),
              ]}
            >
              <Ionicons
                name="call-outline"
                size={17}
                color={canContact ? Skoun.color.primary : "#fff"}
              />
              <LText
                variant="subtitle"
                style={canContact ? styles.outlineText : styles.solidText}
              >
                Call
              </LText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.host}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <LText variant="body" style={styles.avatarLetter}>
              {hostInitial(contactName)}
            </LText>
          </View>
          <View style={styles.hostCopy}>
            <LText variant="body" style={styles.hostName} numberOfLines={1}>
              {contactName ?? "Host"}
            </LText>
            <LText variant="caption" tone="muted" style={styles.hostMeta}>
              {hostCaption}
            </LText>
            {hasRating ? (
              <View style={styles.metaRow}>
                <Ionicons name="star" size={13} color={Skoun.color.inkMuted} />
                <LText variant="caption" tone="muted" style={styles.metaText}>
                  {`${listing.rating!.toFixed(1)} · ${listing.reviewCount} review${listing.reviewCount === 1 ? "" : "s"}`}
                </LText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          {reported ? (
            <LText variant="caption" tone="muted">
              You reported this listing
            </LText>
          ) : (
            <Pressable
              onPress={onReport}
              accessibilityRole="button"
              accessibilityLabel="Report this listing"
              style={styles.report}
            >
              {({ hovered }) => (
                <LText
                  variant="caption"
                  tone="muted"
                  style={[styles.reportText, hovered && styles.reportHover]}
                >
                  Report this listing
                </LText>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {toc.length > 0 ? <ListingTocRail items={toc} /> : null}
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
    padding: 16,
    gap: 14,
    overflow: "visible",
    ...CARD_SHADOW,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    zIndex: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    lineHeight: 21,
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
  ticket: {
    flexDirection: "row",
    backgroundColor: Skoun.color.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    overflow: "hidden",
  },
  ticketRail: {
    width: 4,
    backgroundColor: Skoun.color.primary,
  },
  ticketBody: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  fareKicker: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: Skoun.color.inkMuted,
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  fareAmt: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 28,
    lineHeight: 32,
    color: Skoun.color.ink,
    letterSpacing: -0.6,
  },
  fareUnit: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  ticketSplit: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B7C6DC",
  },
  actions: {
    gap: 8,
  },
  solid: {
    minHeight: 48,
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "border-color",
          transitionDuration: "160ms",
        } as object)
      : null),
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
  host: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    color: "#fff",
  },
  hostCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hostName: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  hostMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5EAF1",
    paddingTop: 10,
  },
  report: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  reportText: {
    fontSize: 12,
  },
  reportHover: {
    textDecorationLine: "underline",
    textDecorationColor: Skoun.color.inkMuted,
  },
});
