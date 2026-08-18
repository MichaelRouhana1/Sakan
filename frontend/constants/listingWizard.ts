import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type Ion = ComponentProps<typeof Ionicons>["name"];

export const SPACE_TYPE_OPTIONS = [
  {
    value: "entire_place" as const,
    title: "Entire place",
    body: "Full apartment or studio rented as one unit.",
    icon: "home-outline" as Ion,
  },
  {
    value: "private_room" as const,
    title: "Private room",
    body: "Private bedroom with shared or en-suite bath.",
    icon: "bed-outline" as Ion,
  },
  {
    value: "shared_room" as const,
    title: "Shared room",
    body: "Shared bedroom or dormitory with roommates.",
    icon: "people-outline" as Ion,
  },
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment" as const, label: "Apartment" },
  { value: "studio" as const, label: "Studio" },
  { value: "dormitory" as const, label: "Dorm / residence" },
  { value: "house" as const, label: "House / chalet" },
];

export const PRICE_BASIS_OPTIONS = [
  { value: "per_unit_month" as const, label: "Per unit / month" },
  { value: "per_bed_month" as const, label: "Per bed / month" },
  { value: "per_room_month" as const, label: "Per room / month" },
];

export const FURNISHING_OPTIONS = [
  { value: "furnished" as const, label: "Fully furnished" },
  { value: "semi" as const, label: "Semi-furnished" },
  { value: "unfurnished" as const, label: "Unfurnished" },
];

export const AMENITY_OPTIONS: { slug: string; label: string; icon: Ion }[] = [
  { slug: "ac_all_rooms", label: "AC in all rooms", icon: "snow-outline" },
  { slug: "ac_salon", label: "AC in salon only", icon: "snow-outline" },
  { slug: "washer", label: "Washing machine", icon: "shirt-outline" },
  { slug: "study_desk", label: "Study desk & chair", icon: "desktop-outline" },
  { slug: "fridge", label: "Refrigerator", icon: "cube-outline" },
  { slug: "microwave", label: "Microwave", icon: "restaurant-outline" },
  { slug: "balcony", label: "Balcony / terrace", icon: "image-outline" },
  { slug: "parking", label: "Dedicated parking", icon: "car-outline" },
  { slug: "water_heater_solar", label: "Solar water heater", icon: "sunny-outline" },
  { slug: "water_heater_electric", label: "Electric geyser", icon: "thermometer-outline" },
];

export const HIGHLIGHT_TAG_OPTIONS: { slug: string; label: string }[] = [
  { slug: "walk_to_campus", label: "Walk to campus" },
  { slug: "power_24_7", label: "24/7 power" },
  { slug: "fiber", label: "Fiber internet" },
  { slug: "quiet_area", label: "Quiet area" },
  { slug: "newly_renovated", label: "Newly renovated" },
];

export const LEASE_TERM_OPTIONS = [
  { value: "semester" as const, label: "Semester" },
  { value: "months_6" as const, label: "6 months" },
  { value: "months_9" as const, label: "9 months" },
  { value: "year" as const, label: "1 year" },
  { value: "flexible" as const, label: "Flexible / sublet" },
];

export const PAYMENT_MODALITY_OPTIONS = [
  { value: "monthly" as const, label: "Paid monthly" },
  { value: "semester" as const, label: "Per semester upfront" },
  { value: "quarterly" as const, label: "Paid quarterly" },
];

export const GENERATOR_AMP_OPTIONS = [5, 10, 15] as const;

export const PHOTO_CAPTION_PRESETS = [
  "Bedroom 1",
  "Bedroom 2",
  "Bathroom",
  "Kitchen",
  "Living room",
  "View",
  "Building",
];

export const WIZARD_STEPS = [
  { id: "type", title: "What kind of place is this?", subtitle: "Rental model, building type, and how you price it." },
  { id: "location", title: "Where is it?", subtitle: "Pin the building so students can walk the commute." },
  { id: "specs", title: "Layout and size", subtitle: "Beds, baths, floor, and how many people can live here." },
  { id: "utilities", title: "Power, water, amenities", subtitle: "Lebanon essentials first — then the comforts." },
  { id: "rules", title: "Who can stay?", subtitle: "Gender, tenant mix, and house rules." },
  { id: "photos", title: "Show the place", subtitle: "At least 3 photos. First one is the search cover." },
  { id: "pricing", title: "Rent and terms", subtitle: "USD, deposit, lease length, and when it is free." },
  { id: "copy", title: "Title and story", subtitle: "What renters read before they tap WhatsApp." },
  { id: "contact", title: "How they reach you", subtitle: "Role, phone, and WhatsApp." },
  { id: "review", title: "Review and publish", subtitle: "Looks right? One listing credit if you already have a live post." },
] as const;

export function amenityLabel(slug: string): string {
  return AMENITY_OPTIONS.find((o) => o.slug === slug)?.label ?? slug;
}

export function highlightLabel(slug: string): string {
  return HIGHLIGHT_TAG_OPTIONS.find((o) => o.slug === slug)?.label ?? slug;
}
