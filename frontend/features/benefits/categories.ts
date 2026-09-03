import type { Ionicons } from "@expo/vector-icons";
import type { BenefitCategory } from "./types";

type CategoryMeta = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  /** Deep enough to clear 4.5:1 on `tint`. */
  accent: string;
  tint: string;
};

/**
 * Deep, desaturated accents that sit calmly on the cool Skoun ground — the
 * point is that a student can scan the grid by colour and shape, so each
 * category has to stay distinguishable from the brand blue.
 */
export const BENEFIT_CATEGORIES: Record<BenefitCategory, CategoryMeta> = {
  tech: {
    label: "Tech",
    icon: "hardware-chip-outline",
    accent: "#2F6FED",
    tint: "#E8EEF6",
  },
  food: {
    label: "Food",
    icon: "restaurant-outline",
    accent: "#B45309",
    tint: "#FDF3E3",
  },
  services: {
    label: "Services",
    icon: "construct-outline",
    accent: "#0F766E",
    tint: "#E3F1EF",
  },
  entertainment: {
    label: "Entertainment",
    icon: "film-outline",
    accent: "#C2410C",
    tint: "#FDEDE6",
  },
  finance: {
    label: "Finance",
    icon: "wallet-outline",
    accent: "#166534",
    tint: "#E6F0E9",
  },
  telecom: {
    label: "Telecom",
    icon: "cellular-outline",
    accent: "#9F1239",
    tint: "#FBE9EE",
  },
};

export const BENEFIT_CATEGORY_ORDER: BenefitCategory[] = [
  "tech",
  "food",
  "services",
  "entertainment",
  "finance",
  "telecom",
];

export function categoryMeta(category: BenefitCategory): CategoryMeta {
  return BENEFIT_CATEGORIES[category] ?? BENEFIT_CATEGORIES.services;
}
