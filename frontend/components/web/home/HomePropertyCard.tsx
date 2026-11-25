import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
import { listingImageCornerBadge } from "@/components/listings/ListingRatingBadge";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { recordFeaturedImpression, rememberPlacement } from "@/features/promotions/activity";
import { useIsSaved, useToggleSaved } from "@/features/saved/useSavedListings";
import { bedsAvailableLabel } from "@/lib/bedsAvailability";
import { formatFreshUsd } from "@/lib/format";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import type { Listing } from "@/types/listing";
import { HomePropertyPreview } from "./HomePropertyPreview";
import { useHomeCardPreview } from "./useHomeCardPreview";

export function HomePropertyCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const card = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const notchId = useId();
  const { data: saved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();
  const title = listingCardTitle(listing);
  const area = listingCardSubtitle(listing);
  const price = formatFreshUsd(listing.monthlyRentUsd);
  const bedsLabel = bedsAvailableLabel(listing.bedsAvailable, listing.bedsTotal);
  const photos = [...(listing.photos ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((photo) => photo.url)
    .filter(Boolean);
  if (!photos.length && listing.coverUrl) photos.push(listing.coverUrl);

  const badge = listingImageCornerBadge(listing);
  const featured = badge?.label === "Featured";
  const rating = listing.rating;
  const hasRating = rating != null && Number.isFinite(rating) && (listing.reviewCount ?? 0) > 0;
  const isNew = badge?.label === "New";
  const hasBadge = hasRating || isNew;

  useLayoutEffect(() => {
    const titleNode = heading.current;
    const mediaNode = media.current;
    if (!titleNode || !mediaNode) return;
    const fitTitle = () => {
      titleNode.removeAttribute("data-compact-title");
      if (titleNode.scrollHeight > titleNode.clientHeight + 1) {
        titleNode.setAttribute("data-compact-title", "");
      }
    };
    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(mediaNode);
    document.fonts.addEventListener("loadingdone", fitTitle);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fitTitle);
    };
  }, [title]);

  useEffect(() => {
    const node = card.current;
    if (!node || listing.promotion?.type !== "featured" || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        timer = setTimeout(() => {
          if (document.visibilityState === "visible") void recordFeaturedImpression(listing, "web_viewable");
        }, 1000);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(node);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [listing]);

  const link = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const preview = useHomeCardPreview(card, link, panel);

  const open = () => {
    preview.close();
    rememberPlacement(listing);
    router.push(`/(renter)/listing/${listing.id}`);
  };

  // Shared by the card's body link and the preview panel, so both open the listing identically.
  const onLinkClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      rememberPlacement(listing);
      return;
    }
    event.preventDefault();
    open();
  };

  return (
    <article ref={card} className="home-property-card" {...preview.cardProps}>
      <div ref={media} className="home-property-card__media">
        <div className="home-property-card__photo-frame" style={hasBadge ? { clipPath: `url(#${notchId})` } : undefined}>
          <ListingCardCarousel urls={photos} fill presentation="home" onPressCard={open} />
        </div>
        {featured && <span className="home-property-card__offer">Featured</span>}
        <div className="home-property-card__favorite" {...preview.heartProps}>
          <FavoriteButton
            saved={saved}
            onPress={() => toggleSaved.mutate(listing)}
            iconSize={22}
            style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          />
        </div>
        {hasBadge && (
          <>
            <svg className="home-property-card__cutout" width="0" height="0" aria-hidden="true">
              <clipPath id={notchId} clipPathUnits="objectBoundingBox">
                {/* The cutout occupies the bottom-left 48.2% by 20.2% of the square. */}
                <path d="M0 0H1V1H.482C.427 1 .381 .954 .355 .902C.336 .863 .31 .84 .278 .84H.064C.032 .84 .004 .827 0 .802Z" />
              </clipPath>
            </svg>
            <div className="home-property-card__badge-wrap">
              {hasRating ? (
                <span className="home-property-card__badge home-property-card__badge--rating" aria-label={`${rating.toFixed(1)} out of 5`}>
                  <Ionicons name="star" size={12} color="#ea3f4a" aria-hidden />
                  {rating.toFixed(1)}/5
                </span>
              ) : (
                <span className="home-property-card__badge home-property-card__badge--new">New</span>
              )}
            </div>
          </>
        )}
      </div>
      <a
        ref={link}
        className="home-property-card__body"
        href={`/listing/${listing.id}`}
        aria-label={title}
        onClick={onLinkClick}
        {...preview.linkProps}
      >
        <h3 ref={heading} className="home-property-card__title" title={title}>{title}</h3>
        <p className="home-property-card__area">{area}</p>
        <p className="home-property-card__price">From {price}/month</p>
        {bedsLabel ? <p className="home-property-card__beds">{bedsLabel}</p> : null}
      </a>
      {preview.anchor &&
        createPortal(
          <HomePropertyPreview
            listing={listing}
            anchor={preview.anchor}
            title={title}
            area={area}
            photos={photos}
            saved={saved}
            featured={featured}
            rating={hasRating ? rating : null}
            isNew={isNew}
            onToggleSaved={() => toggleSaved.mutate(listing)}
            onOpenClick={onLinkClick}
            panelRef={panel}
            panelProps={preview.panelProps}
          />,
          document.body,
        )}
    </article>
  );
}
