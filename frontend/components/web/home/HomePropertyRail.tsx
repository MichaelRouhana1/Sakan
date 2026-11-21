import { Ionicons } from "@expo/vector-icons";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { Listing } from "@/types/listing";
import { HomePropertyCard } from "./HomePropertyCard";
import { homeRevealProps } from "./useHomeScrollReveal";
import "./HomePropertyCard.css";

const ROW_STEP = 2;

export function HomePropertyRail({
  listings,
  filters,
  status,
  area,
}: {
  listings: Listing[];
  filters: ReactNode;
  status?: ReactNode;
  area: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [edges, setEdges] = useState({ start: true, end: true });
  const showListings = !status && listings.length > 0;

  function updateEdges() {
    const node = track.current;
    if (!node) return;
    const start = node.scrollLeft <= 1;
    const end = node.scrollLeft >= node.scrollWidth - node.clientWidth - 1;
    setEdges((prev) => prev.start === start && prev.end === end ? prev : { start, end });
  }

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [area, listings.length, showListings]);

  function scrollByCards(direction: -1 | 1) {
    const node = track.current;
    const first = node?.firstElementChild as HTMLElement | null | undefined;
    if (!node || !first) return;
    const gap = parseFloat(getComputedStyle(node).columnGap);
    const step = (first.offsetWidth + gap) * ROW_STEP;
    node.scrollBy({
      left: direction * step,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <div className="home-property-rail">
      <div className="home-property-rail__toolbar">
        <div className="home-property-rail__filters">{filters}</div>
        {showListings && (
          <div className="home-property-rail__controls">
            <button type="button" aria-label="Previous properties" aria-controls={trackId} disabled={edges.start} onClick={() => scrollByCards(-1)}>
              <Ionicons name="chevron-back" size={12} />
            </button>
            <button type="button" aria-label="Next properties" aria-controls={trackId} disabled={edges.end} onClick={() => scrollByCards(1)}>
              <Ionicons name="chevron-forward" size={12} />
            </button>
          </div>
        )}
      </div>
      {status || (
        <div key={area} className="home-property-rail__track" id={trackId} ref={track} onScroll={updateEdges} role="region" aria-label="Places across Lebanon">
          {listings.map((listing) => (
            <View key={listing.id} {...homeRevealProps("card", 60, "listings")} testID={`home-listing-${listing.id}`}>
              <HomePropertyCard listing={listing} />
            </View>
          ))}
        </div>
      )}
    </div>
  );
}
