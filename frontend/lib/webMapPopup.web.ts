import type { MapPinGroup } from "@/lib/mapPinGroups";
import type { WebMapDisplayGroup } from "@/lib/webMapDisplayGroups.web";
import { listingCardTitle } from "@/lib/listingCardMeta";
import { amberPopupHtml, createAmberGroupItemsHtml, createAmberGroupPopupHtml } from "@/lib/studentlyMapbox.web";

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Opt-in layer presentation; the HTML-marker rollback keeps its old markup. */
export function webMapPopupHtml(group: MapPinGroup | WebMapDisplayGroup): string {
  const places = "placeGroups" in group ? group.placeGroups : [group];
  if (places.length <= 1) return group.count > 1 ? createAmberGroupPopupHtml(group, "listings") : amberPopupHtml(group);
  const sections = places.map(place => {
    const listing = place.listings[0];
    if (!listing) return "";
    const title = listing.buildingName?.trim() || listing.pbsaBuildingName?.trim() || listingCardTitle(listing);
    // Only the public contact name already present on browse listings. Never
    // interpolate poster IDs, phone numbers, contact objects or profile data.
    const contact = listing.contactName?.trim() || "Host";
    return `<section class="studently-popup-place-group">
      <h3 class="studently-popup-place-title">${escapeHtml(title)}</h3>
      <div class="studently-popup-place-contact">Listed by ${escapeHtml(contact)}</div>
      <div class="studently-popup-place-count">${place.count} listing${place.count === 1 ? "" : "s"}</div>
      ${createAmberGroupItemsHtml(place.listings)}
    </section>`;
  }).join("");
  return `<div class="studently-amber-popup-card studently-amber-popup-group studently-amber-popup-composite">
    <div class="studently-popup-group-header"><span>${group.count} listings · ${places.length} places</span>
      <button type="button" class="studently-popup-close-btn" aria-label="Close">✕</button>
    </div>
    <div class="studently-popup-group-list">${sections}</div>
  </div>`;
}
