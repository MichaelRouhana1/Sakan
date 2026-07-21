/** Shared nav tokens — lister UI uses constants/listerTheme.ts */
import { Lister } from "@/constants/listerTheme";

const tintColorLight = Lister.color.primary;
const tintColorDark = Lister.color.primarySoft;

export default {
  light: {
    text: Lister.color.ink,
    background: Lister.color.bg,
    tint: tintColorLight,
    tabIconDefault: Lister.color.inkFaint,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: Lister.color.bg,
    background: "#0A1612",
    tint: tintColorDark,
    tabIconDefault: Lister.color.inkMuted,
    tabIconSelected: tintColorDark,
  },
};
