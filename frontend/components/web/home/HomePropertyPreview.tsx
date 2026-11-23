import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { amenityLabel } from "@/constants/listingWizard";
import { formatFreshUsd } from "@/lib/format";
import { formatCampusWalkLine } from "@/lib/listingCardMeta";
import { resolveMediaUrls } from "@/lib/mediaUrl";
import type { Listing } from "@/types/listing";
import type { PreviewAnchor } from "./useHomeCardPreview";

export const PREVIEW_MAX_PHOTOS = 8;
export const PREVIEW_MAX_CHIPS = 3;
export const PREVIEW_ADVANCE_MS = 1800;

type Props = {
  listing: Listing;
  anchor: PreviewAnchor;
  title: string;
  area: string;
  photos: string[];
  saved: boolean;
  featured: boolean;
  rating: number | null;
  isNew: boolean;
  onToggleSaved: () => void;
  onOpenClick: (event: ReactMouseEvent<HTMLElement>) => void;
  panelRef: Ref<HTMLDivElement>;
  panelProps: Record<string, unknown>;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export function HomePropertyPreview({
  listing,
  anchor,
  title,
  area,
  photos,
  saved,
  featured,
  rating,
  isNew,
  onToggleSaved,
  onOpenClick,
  panelRef,
  panelProps,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const urls = resolveMediaUrls(photos).slice(0, PREVIEW_MAX_PHOTOS);
  const count = urls.length;
  const [index, setIndex] = useState(0);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Only the slide being shown and the next one have an image set; the rest are never requested
  // until the carousel reaches them.
  const reached = useRef(0);
  reached.current = Math.max(reached.current, index);

  // A single photo never auto-advances. Reduced motion never auto-advances. The timer restarts
  // whenever the slide changes, so a manual change gets a full dwell time.
  useEffect(() => {
    if (count < 2 || reduced) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), PREVIEW_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, index, reduced]);

  const step = (direction: 1 | -1) => (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + direction + count) % count);
  };

  const hasRating = rating != null;
  const location = (() => {
    const address = listing.addressLine?.trim();
    if (!address) return area;
    return area && !address.toLowerCase().includes(area.toLowerCase()) ? `${address}, ${area}` : address;
  })();
  const walk = formatCampusWalkLine(listing.distanceMeters, listing.nearestCampusName);
  const chips = (listing.amenities ?? []).filter(Boolean).slice(0, PREVIEW_MAX_CHIPS).map(amenityLabel);

  const style = {
    left: anchor.left,
    top: anchor.top,
    transformOrigin: `${anchor.originX}px ${anchor.originY}px`,
    "--from-scale": anchor.fromScale,
  } as CSSProperties;

  return (
    <div
      ref={panelRef}
      className="home-property-preview"
      role="group"
      aria-label={`${title} preview`}
      data-home-preview
      data-via={anchor.via}
      style={style}
      {...panelProps}
    >
      <a
        ref={linkRef}
        className="home-property-preview__link"
        href={`/listing/${listing.id}`}
        aria-label={title}
        tabIndex={-1}
        onClick={onOpenClick}
      />
      <div
        className="home-property-preview__media"
        tabIndex={-1}
        onClick={(event) => {
          // The media sits above the link overlay so its arrows can reveal on hover; forward the
          // click so it behaves exactly like clicking anywhere else on the panel.
          if (!(event.target as HTMLElement).closest("button")) linkRef.current?.click();
        }}
      >
        {urls.map((url, slide) => (
          <span
            key={url + slide}
            className="home-property-preview__slide"
            data-on={slide === index ? "" : undefined}
            style={slide <= reached.current + 1 ? { backgroundImage: `url("${url}")` } : undefined}
          />
        ))}
        <span className="home-property-preview__scrim" aria-hidden="true" />
        {count > 1 && (
          <div className="home-property-preview__segments" aria-hidden="true">
            {urls.map((url, segment) => {
              const state = segment < index || (reduced && segment === index) ? "done" : segment === index ? "now" : "todo";
              return (
                <span key={url + segment} className="home-property-preview__segment">
                  <span
                    className="home-property-preview__fill"
                    data-state={state}
                    style={state === "now" ? { animationDuration: `${PREVIEW_ADVANCE_MS}ms` } : undefined}
                  />
                </span>
              );
            })}
          </div>
        )}
        {featured && <span className="home-property-preview__offer">Featured</span>}
        {count > 1 && (
          <>
            <button type="button" className="home-property-preview__nav home-property-preview__nav--prev" aria-label="Previous photo" onClick={step(-1)}>
              <Chevron direction="left" />
            </button>
            <button type="button" className="home-property-preview__nav home-property-preview__nav--next" aria-label="Next photo" onClick={step(1)}>
              <Chevron direction="right" />
            </button>
          </>
        )}
        <div className="home-property-preview__heart">
          <FavoriteButton
            saved={saved}
            onPress={onToggleSaved}
            iconSize={24}
            style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          />
        </div>
      </div>
      <div className="home-property-preview__body">
        <div className="home-property-preview__head">
          <h3 className="home-property-preview__name">{title}</h3>
          {hasRating ? (
            <span className="home-property-card__badge home-property-card__badge--rating home-property-preview__badge" aria-label={`${rating.toFixed(1)} out of 5`}>
              <Ionicons name="star" size={12} color="#ea3f4a" aria-hidden />
              {rating.toFixed(1)}/5
            </span>
          ) : isNew ? (
            <span className="home-property-card__badge home-property-card__badge--new home-property-preview__badge">New</span>
          ) : null}
        </div>
        {location ? <p className="home-property-preview__location">{location}</p> : null}
        {walk ? (
          <p className="home-property-preview__walk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3ZM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z" />
            </svg>
            {walk}
          </p>
        ) : null}
        {chips.length ? (
          <ul className="home-property-preview__chips">
            {chips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="home-property-preview__footer">
        <p className="home-property-preview__price">
          <span>From</span> {formatFreshUsd(listing.monthlyRentUsd)}<span>/month</span>
        </p>
        <span className="home-property-preview__view">
          View property
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
