import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { HeroCap } from "@/components/campus/HeroCap";
import { HeroRipple } from "@/components/campus/HeroRipple";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

type PressState = { pressed: boolean; hovered?: boolean };
type IonName = React.ComponentProps<typeof Ionicons>["name"];

const web = Platform.OS === "web";

function useLayoutWidth() {
  const { width } = useWindowDimensions();
  const [inner, setInner] = useState(() =>
    web && typeof window !== "undefined" ? window.innerWidth : width,
  );
  useEffect(() => {
    if (!web || typeof window === "undefined") return;
    const sync = () => setInner(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return web ? inner : width;
}

const TOOLS: readonly {
  id: string;
  live: boolean;
  href?: string;
  title: string;
  body: string;
  icon: IonName;
}[] = [
  {
    id: "calculator",
    live: true,
    href: "/campus/calculator",
    title: "Tuition calculator",
    body: "Estimate a major’s total tuition, cost per year and per semester, in USD.",
    icon: "calculator-outline",
  },
  {
    id: "universities",
    live: false,
    title: "Universities",
    body: "Campuses, faculties, buildings, and amenities — coming later.",
    icon: "school-outline",
  },
  {
    id: "calendar",
    live: true,
    href: "/campus/calendar",
    title: "Academic calendar",
    body: "Official Lebanese holidays — the days campuses close.",
    icon: "calendar-outline",
  },
  {
    id: "benefits",
    live: true,
    href: "/campus/benefits",
    title: "Student benefits",
    body: "Verified student discounts on software, food, transport, and telecom.",
    icon: "pricetag-outline",
  },
];

export function CampusHomePage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const width = useLayoutWidth();
  const uni =
    user?.campus?.institutionShortName?.trim() ||
    user?.campus?.institutionName?.trim() ||
    null;

  const compact = width < 640;
  const stacked = width < 980;
  // 4 across on desktop, 2x2 on tablet, 1 column on phones.
  const perRow = compact ? 1 : stacked ? 2 : 4;

  const go = (href: string) => router.push(href as never);

  return (
    <View style={styles.page}>
      <View
        style={[styles.hero, stacked && styles.heroStacked]}
        pointerEvents="box-none"
      >
        <View style={styles.rippleHost} pointerEvents="auto">
          <HeroRipple />
        </View>

        <View style={styles.copy} pointerEvents="box-none">
          <View style={styles.copyRead} pointerEvents="none">
            <View style={styles.badge}>
              <Ionicons name="school" size={13} color="#FFFFFF" />
              <LText style={styles.badgeText}>
                {uni ? `Campus · ${uni}` : "Campus · Lebanon"}
              </LText>
            </View>
            <LText
              accessibilityRole="header"
              variant="display"
              style={[styles.title, compact && styles.titleCompact]}
            >
              {uni ? `Your ${uni} student home` : "Your student home"}
            </LText>
            <LText
              variant="body"
              tone="muted"
              style={[styles.lede, compact && styles.ledeCompact]}
            >
              {uni
                ? `Free tools for ${uni} students — tuition, calendar, benefits, and housing nearby.`
                : "Free tools for UA students — tuition, calendar, benefits, and housing nearby."}
            </LText>
          </View>
          <Pressable
            onPress={() => go("/campus/calculator")}
            accessibilityRole="link"
            accessibilityLabel="Open tuition calculator"
            style={({ pressed, hovered }: PressState) => [
              styles.cta,
              styles.motion,
              (hovered || pressed) && styles.ctaHover,
            ]}
          >
            <LText style={styles.ctaText}>Open tuition calculator</LText>
            <Ionicons name="arrow-forward" size={16} color={Skoun.color.ink} />
          </Pressable>
        </View>

        <View
          style={[styles.visual, stacked && styles.visualStacked]}
          pointerEvents="box-none"
        >
          <HeroCap />
        </View>
      </View>

      <View style={styles.tools}>
        <View style={[styles.divider, compact && styles.dividerCompact]} />

        <View style={styles.cols}>
          {TOOLS.map((tool, i) => {
            const lastInRow = (i + 1) % perRow === 0;
            const lastRow = i >= TOOLS.length - perRow;
            const inner = (
              <>
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={tool.live ? Skoun.color.primary : Skoun.color.inkFaint}
                />
                <LText
                  variant="subtitle"
                  tone={tool.live ? undefined : "muted"}
                  style={styles.colTitle}
                >
                  {tool.title}
                </LText>
                <LText variant="caption" tone="muted" style={styles.colBody}>
                  {tool.body}
                </LText>
              </>
            );

            const colStyle = [
              styles.col,
              perRow === 4 && styles.colQuarter,
              perRow === 2 && styles.colHalf,
              perRow === 1 && styles.colFull,
              compact && styles.colCompact,
              !lastInRow && styles.colRule,
              !lastRow && styles.colRuleBottom,
            ];

            if (tool.live && tool.href) {
              return (
                <Pressable
                  key={tool.id}
                  onPress={() => go(tool.href!)}
                  accessibilityRole="link"
                  accessibilityLabel={tool.title}
                  style={({ pressed, hovered }: PressState) => [
                    ...colStyle,
                    styles.motion,
                    (hovered || pressed) && styles.colHover,
                  ]}
                >
                  {inner}
                </Pressable>
              );
            }

            return (
              <View
                key={tool.id}
                style={[...colStyle, styles.colSoon]}
                accessibilityLabel={`${tool.title}, coming later`}
              >
                {inner}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 8,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 48,
    width: "100%",
    // No vertical padding: the cap fills the full 424px hero height that
    // the old 28 + 360 + 36 layout occupied, so the page below doesn't move.
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 424,
  },
  rippleHost: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  heroStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 28,
    minHeight: 0,
    paddingTop: 8,
    paddingBottom: 36,
  },
  copy: {
    flex: 1,
    maxWidth: 560,
    gap: 18,
    minWidth: 0,
    zIndex: 1,
  },
  copyRead: {
    gap: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
  },
  badgeText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: "#FFFFFF",
  },
  title: {
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.4,
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  lede: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 460,
  },
  ledeCompact: {
    fontSize: 15,
    lineHeight: 23,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Skoun.color.ink,
    cursor: "pointer",
  },
  ctaHover: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  ctaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  visual: {
    flex: 1.4,
    minWidth: 0,
    minHeight: 320,
    maxWidth: 760,
    height: 424,
    zIndex: 1,
  },
  visualStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 280,
    width: "100%",
    maxWidth: "100%",
    minHeight: 280,
    height: 280,
  },
  motion: web
    ? ({
        transitionProperty: "background-color, border-color",
        transitionDuration: "160ms",
        transitionTimingFunction: "ease",
      } as object)
    : {},
  tools: {
    width: "100%",
  },
  // Rule sits above the tools with clear air before them.
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Skoun.color.border,
    marginBottom: 24,
  },
  dividerCompact: {
    marginBottom: 8,
  },
  cols: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    width: "100%",
    // Bottom space lives on the grid, not the cards, so the vertical
    // rules end just under the text instead of running to the bottom.
    paddingBottom: 28,
  },
  col: {
    minWidth: 0,
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 28,
    cursor: "pointer",
  },
  colQuarter: {
    flexBasis: "25%",
    maxWidth: "25%",
  },
  colHalf: {
    flexBasis: "50%",
    maxWidth: "50%",
  },
  colFull: {
    width: "100%",
  },
  colCompact: {
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  colRule: {
    borderRightWidth: 1,
    borderRightColor: Skoun.color.border,
  },
  colRuleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  colHover: {
    backgroundColor: "rgba(47, 111, 237, 0.04)",
  },
  colSoon: {
    cursor: "auto",
    opacity: 0.72,
  },
  colTitle: {
    fontSize: 17,
    lineHeight: 24,
    marginTop: 4,
  },
  colBody: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 280,
  },
});
