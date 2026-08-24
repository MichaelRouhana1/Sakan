import type { LucideIcon } from "lucide-react-native";
import {
  ArrowUpDown,
  BatteryCharging,
  Droplets,
  Footprints,
  Globe,
  GraduationCap,
  Lightbulb,
  MapPin,
  Paintbrush,
  Shield,
  ShowerHead,
  Sparkles,
  Sun,
  UserRound,
  Users,
  VolumeOff,
  Wifi,
  Zap,
} from "lucide-react-native";

/** Stable keys used by listing amber pills / policy tags. */
export type ListingPillIconKey =
  | "girls"
  | "boys"
  | "zap"
  | "sun"
  | "wifi"
  | "battery"
  | "droplets"
  | "shower"
  | "elevator"
  | "graduation"
  | "users"
  | "mapPin"
  | "footprints"
  | "globe"
  | "shield"
  | "lightbulb"
  | "volumeOff"
  | "sparkles"
  | "paintbrush";

export const LISTING_PILL_ICONS: Record<ListingPillIconKey, LucideIcon> = {
  girls: UserRound,
  boys: UserRound,
  zap: Zap,
  sun: Sun,
  wifi: Wifi,
  battery: BatteryCharging,
  droplets: Droplets,
  shower: ShowerHead,
  elevator: ArrowUpDown,
  graduation: GraduationCap,
  users: Users,
  mapPin: MapPin,
  footprints: Footprints,
  globe: Globe,
  shield: Shield,
  lightbulb: Lightbulb,
  volumeOff: VolumeOff,
  sparkles: Sparkles,
  paintbrush: Paintbrush,
};

export function highlightTagIcon(slug: string): ListingPillIconKey | undefined {
  switch (slug) {
    case "walk_to_campus":
      return "footprints";
    case "power_24_7":
      return "zap";
    case "fiber":
      return "wifi";
    case "quiet_area":
      return "volumeOff";
    case "newly_renovated":
      return "paintbrush";
    default:
      return "sparkles";
  }
}
