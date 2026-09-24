import { LISTING_TYPE_LABELS } from "@/lib/listingLabels";
import { ELECTRICITY_LABELS } from "@/constants/utilities";
import type { Dimension, MatcherPreferences } from "./types";

export const QUESTIONS: { key: Dimension; prompt: string; hint: string }[] = [
  {
    key: "type",
    prompt: "What kind of place feels right?",
    hint: "Choose one or a few. We’ll start with what feels like you.",
  },
  {
    key: "budget",
    prompt: "What monthly rent works for you?",
    hint: "Advertised rent; per bed, room, or whole place as listed. Deposits and extra costs are separate.",
  },
  {
    key: "location",
    prompt: "Where would you like to be?",
    hint: "Choose a campus or area. Distances are straight-line estimates, not walking routes.",
  },
  {
    key: "gender",
    prompt: "Any listing gender restriction you want?",
    hint: "These are restrictions set by hosts. No preference includes listings with restrictions.",
  },
  {
    key: "power",
    prompt: "What power setup would you prefer?",
    hint: "We’ll use what hosts report about their electricity setup.",
  },
  {
    key: "wifi",
    prompt: "Would you like Wi-Fi included?",
    hint: "One less thing to arrange when you move in.",
  },
];
export function answerLabel(p: MatcherPreferences, d: Dimension): string {
  switch (d) {
    case "type":
      return (
        p.type?.value.map((t) => LISTING_TYPE_LABELS[t]).join(" · ") ??
        "No preference"
      );
    case "budget": {
      const b = p.budget?.value;
      return !b
        ? "No limit"
        : b.min != null && b.max != null
          ? `$${b.min}–$${b.max}/month`
          : b.max != null
            ? `Up to $${b.max}/month`
            : `From $${b.min}/month`;
    }
    case "location":
      return p.location
        ? `${p.location.value.label}${p.location.importance === "required" && p.location.value.kind === "campus" ? ` · within ${p.location.value.radiusKm ?? 2} km` : ""}`
        : "Anywhere";
    case "gender":
      return (
        p.gender?.value
          .map((v) =>
            v === "girls_only" ? "Girls-only listings" : "Boys-only listings",
          )
          .join(" · ") ?? "No preference"
      );
    case "power":
      return (
        p.power?.value.map((v) => ELECTRICITY_LABELS[v]).join(" or ") ??
        "No preference"
      );
    case "wifi":
      return p.wifi ? "Wi-Fi included" : "No preference";
  }
}
