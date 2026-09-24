import type { Listing } from "@/types/listing";
import {
  DIMENSIONS,
  type Dimension,
  type MatchDetail,
  type MatchFacts,
  type MatcherPreferences,
  type MatchPresentation,
} from "./types";

export const MATCH_RULES = {
  weights: {
    budget: 30,
    location: 30,
    type: 15,
    gender: 10,
    power: 10,
    wifi: 5,
  },
  budgetFalloff: 100,
  campusNearKm: 2,
  campusFarKm: 10,
  areaNearbyKm: 5,
  minimum: 3,
} as const;
export const DIMENSION_LABELS: Record<Dimension, string> = {
  type: "Place type",
  budget: "Budget",
  location: "Location",
  gender: "Gender restriction",
  power: "Power",
  wifi: "Wi-Fi",
};
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function locationDistance(
  f: MatchFacts,
  p: MatcherPreferences,
): number | null {
  const center = p.location?.value.center;
  return center && f.lat != null && f.lng != null
    ? distanceKm(center, { lat: f.lat, lng: f.lng })
    : null;
}
export function budgetDeviation(rent: number, p: MatcherPreferences): number {
  const b = p.budget?.value;
  return b
    ? Math.max(0, (b.min ?? 0) - rent, b.max == null ? 0 : rent - b.max)
    : 0;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function evaluate(f: MatchFacts, p: MatcherPreferences): MatchDetail[] {
  return DIMENSIONS.filter((d) => p[d]).map((d) => {
    let known = true;
    let credit = 0;
    let description = "";
    switch (d) {
      case "budget": {
        known = f.rent != null;
        const delta = known ? budgetDeviation(f.rent!, p) : 0;
        credit = known ? clamp(1 - delta / MATCH_RULES.budgetFalloff) : 0;
        description =
          delta === 0
            ? "Within budget"
            : `$${Math.round(delta)} ${p.budget!.value.max != null && f.rent! > p.budget!.value.max! ? "over" : "below"} your budget range`;
        break;
      }
      case "location": {
        const loc = p.location!.value;
        const km = locationDistance(f, p);
        const exact =
          loc.kind === "area" && f.area != null && loc.areas?.includes(f.area);
        known =
          loc.kind === "campus"
            ? km != null
            : exact === true || (f.area != null && (!loc.center || km != null));
        if (loc.kind === "campus" && km != null) {
          const near = loc.radiusKm ?? MATCH_RULES.campusNearKm;
          credit =
            km <= near
              ? 1
              : clamp(
                  1 - (km - near) / Math.max(1, MATCH_RULES.campusFarKm - near),
                );
          description =
            km <= near
              ? `Within ${near} km of ${loc.label}`
              : `${km.toFixed(1)} km from ${loc.label} (straight line)`;
        } else {
          credit = exact
            ? 1
            : km != null
              ? 0.5 * clamp(1 - km / MATCH_RULES.areaNearbyKm)
              : 0;
          description = exact
            ? `In ${f.area}`
            : km != null
              ? `${km.toFixed(1)} km from ${loc.label}'s center`
              : `Outside ${loc.label}`;
        }
        break;
      }
      case "type":
        known = f.type != null;
        credit = known && p.type!.value.includes(f.type!) ? 1 : 0;
        description = credit
          ? "Your preferred place type"
          : "A different place type";
        break;
      case "gender":
        known = f.gender != null;
        credit =
          known &&
          p.gender!.value.includes(f.gender as "boys_only" | "girls_only")
            ? 1
            : 0;
        description = credit
          ? f.gender === "girls_only"
            ? "Girls-only listing"
            : "Boys-only listing"
          : "Different gender restriction";
        break;
      case "power":
        known = f.power != null;
        credit = known && p.power!.value.includes(f.power!) ? 1 : 0;
        description = credit
          ? f.power === "solar"
            ? "Solar"
            : f.power === "generator_24_7"
              ? "24/7 generator"
              : "Scheduled cuts"
          : "Different power setup";
        break;
      case "wifi":
        known = f.wifi != null;
        credit = f.wifi === true ? 1 : 0;
        description = credit ? "Wi-Fi included" : "Wi-Fi not included";
        break;
    }
    return {
      dimension: d,
      label: DIMENSION_LABELS[d],
      weight: MATCH_RULES.weights[d],
      credit,
      known,
      required: d === "gender" || p[d]!.importance === "required",
      description: known ? description : `${DIMENSION_LABELS[d]} not reported`,
    };
  });
}
const unknownFacts: MatchFacts = {
  rent: null,
  type: null,
  area: null,
  gender: null,
  power: null,
  wifi: null,
  lat: null,
  lng: null,
  priceBasis: null,
};
export function rankListings(
  listings: Listing[],
  prefs: MatcherPreferences,
  now = Date.now(),
) {
  const matches: Record<string, MatchPresentation> = {};
  if (!DIMENSIONS.some((d) => prefs[d])) return { listings, matches };
  const eligible = listings
    .filter((l) => {
      if (
        l.status !== "active" ||
        (l.expiresAt && Date.parse(l.expiresAt) <= now)
      )
        return false;
      const facts = l.matchFacts ?? unknownFacts;
      const details = evaluate(facts, prefs);
      if (details.some((d) => d.required && (!d.known || d.credit !== 1)))
        return false;
      const denominator = details.reduce((sum, d) => sum + d.weight, 0);
      matches[l.id] = {
        score:
          (100 * details.reduce((sum, d) => sum + d.weight * d.credit, 0)) /
          denominator,
        details,
        top: false,
        reasons: details
          .filter((d) => d.known && d.credit === 1)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map((d) => d.description),
        knownCount: details.filter((d) => d.known).length,
        answeredCount: details.length,
        priceBasis: facts.priceBasis,
      };
      return true;
    })
    .sort(
      (a, b) =>
        matches[b.id]!.score - matches[a.id]!.score ||
        timestamp(b) - timestamp(a) ||
        a.id.localeCompare(b.id),
    );
  const best = eligible[0] ? matches[eligible[0].id]!.score : 0;
  eligible
    .filter((l) => best > 0 && matches[l.id]!.score === best)
    .slice(0, 3)
    .forEach((l) => {
      matches[l.id]!.top = true;
    });
  return { listings: eligible, matches };
}
function timestamp(l: Listing) {
  const n = Date.parse(l.publishedAt ?? l.createdAt);
  return Number.isFinite(n) ? n : 0;
}

/** Only broadens the alternative-count explanation. Never mutates scores or eligibility. */
export function explainWidening(
  listings: Listing[],
  prefs: MatcherPreferences,
) {
  let budget = 0;
  let radius =
    prefs.location?.value.kind === "campus"
      ? (prefs.location.value.radiusKm ?? 2)
      : 0;
  const ignored = new Set<Dimension>();
  const labels: string[] = [];
  const soft = (d: Dimension) =>
    Boolean(prefs[d] && d !== "gender" && prefs[d]!.importance === "prefer");
  const count = () =>
    listings.filter((l) => {
      const f = l.matchFacts ?? unknownFacts;
      return evaluate(f, prefs).every((d) => {
        if (ignored.has(d.dimension)) return true;
        if (!d.known) return false;
        if (d.credit === 1) return true;
        if (soft(d.dimension) && d.dimension === "budget")
          return f.rent != null && budgetDeviation(f.rent, prefs) <= budget;
        if (soft(d.dimension) && d.dimension === "location" && radius > 0) {
          const km = locationDistance(f, prefs);
          return km != null && km <= radius;
        }
        return false;
      });
    }).length;
  const strictCount = count();
  let alternativeCount = strictCount;
  const steps: Array<{ enabled: boolean; apply: () => void; label: string }> = [
    {
      enabled: soft("budget"),
      apply: () => {
        budget = 50;
      },
      label: "Considering up to $50 beyond your preferred budget",
    },
    {
      enabled: soft("location") && !!prefs.location?.value.center,
      apply: () => {
        radius = 5;
      },
      label:
        prefs.location?.value.kind === "campus"
          ? "Considering places within 5 km of campus"
          : "Considering nearby places within 5 km of the area center",
    },
    {
      enabled: soft("budget"),
      apply: () => {
        budget = 100;
      },
      label: "Considering up to $100 beyond your preferred budget",
    },
    {
      enabled:
        soft("location") &&
        prefs.location?.value.kind === "campus" &&
        !!prefs.location.value.center,
      apply: () => {
        radius = 10;
      },
      label: "Considering places within 10 km of campus",
    },
    ...(["wifi", "power", "type"] as Dimension[]).map((d) => ({
      enabled: soft(d),
      apply: () => {
        ignored.add(d);
      },
      label: `Also considering alternatives to your ${DIMENSION_LABELS[d].toLowerCase()} preference`,
    })),
  ];
  if (listings.length >= MATCH_RULES.minimum)
    for (const step of steps) {
      if (alternativeCount >= MATCH_RULES.minimum) break;
      if (!step.enabled) continue;
      step.apply();
      labels.push(step.label);
      alternativeCount = count();
    }
  return {
    strictCount,
    alternativeCount,
    labels,
    shortfall: alternativeCount < MATCH_RULES.minimum,
  };
}
