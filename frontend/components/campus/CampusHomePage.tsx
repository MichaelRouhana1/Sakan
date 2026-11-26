import { useDesktopDesign } from "@/components/ui/DesktopDesign";
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
import { campusShellPadTop } from "@/components/campus/CampusShell";
import { HeroCap } from "@/components/campus/HeroCap";
import { HeroRipple } from "@/components/campus/HeroRipple";
import { StrokeHeadline } from "@/components/campus/StrokeHeadline";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

type PressState = { pressed: boolean; hovered?: boolean };
type IonName = React.ComponentProps<typeof Ionicons>["name"];

const web = Platform.OS === "web";

function usePageWidth() {
  const { width } = useWindowDimensions();
  const { scale } = useDesktopDesign();
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
  return (web ? inner : width) / (scale || 1);
}

/** Desktop hero inner floor (shell lift is added on top). Short enough that
 *  the tools row sits on the first screen; leftover viewport still grows here. */
const HERO_DESKTOP = 288;
const HERO_DESKTOP_MIN = 216;
/** Divider + four-up tools. Kept out of the hero so they stay above the fold. */
const TOOLS_DESKTOP_RESERVE = 216;
const HERO_STACKED_VISUAL = 340;

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

export function CampusHomePage() {const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  const router = useRouter();
  const { user } = useAuthSession();
  const width = usePageWidth();
  const uni =
    user?.campus?.institutionShortName?.trim() ||
    user?.campus?.institutionName?.trim() ||
    null;

  const compact = width < 640;
  const narrowPhone = width < 390;
  const stacked = width < 980;
  // 4 across on desktop, 2x2 on tablet, single interactive list on phones.
  const perRow = compact ? 1 : stacked ? 2 : 4;
  // On mobile, surface live tools first so the three working tools stay
  // immediately reachable above/near the fold, with upcoming items last.
  const orderedTools = compact
    ? [...TOOLS.filter((t) => t.live), ...TOOLS.filter((t) => !t.live)]
    : TOOLS;
  // Pull the hero up under the top nav so its background runs flush against
  // it, then give back the same distance as inner top padding so the copy,
  // the cap and everything below stay exactly where they were.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const lift = campusShellPadTop(windowWidth);
  const heroInner = stacked
    ? 0
    : Math.min(
        HERO_DESKTOP,
        Math.max(
          HERO_DESKTOP_MIN,
          windowHeight - WEB_NAV_HEIGHT - TOOLS_DESKTOP_RESERVE - lift,
        ),
      );
  const heroLift = {
    marginTop: -lift,
    paddingTop: (compact ? 14 : stacked ? 8 : 0) + lift,
    ...(stacked ? null : { minHeight: heroInner + lift }),
  };

  const go = (href: string) => router.push(href as never);

  return (
    <View style={[styles.page, compact && styles.pageCompact, !stacked && styles.pageDesktop]}>
      <View
        style={[
          styles.hero,
          stacked && styles.heroStacked,
          compact && styles.heroCompact,
          compact && web && styles.heroCompactBleed,
          heroLift,
        ]}
      >
        <View style={styles.rippleHost}>
          <HeroRipple />
        </View>

        <View
          style={[
            styles.copy,
            compact && styles.copyCompact,
            !stacked && styles.copyDesktop,
          ]}
        >
          <View
            style={[
              styles.copyRead,
              compact && styles.copyReadCompact,
              !stacked && styles.copyReadDesktop,
            ]}
          >
            <View style={[styles.badge, compact && styles.badgeCompact]}>
              <Ionicons name="school" size={designSize(13)} color="#FFFFFF" />
              <LText style={styles.badgeText}>
                {uni ? `Campus · ${uni}` : "Campus · Lebanon"}
              </LText>
            </View>
            <StrokeHeadline
              text={uni ? `Your ${uni} student home` : "Your student home"}
              fontSize={compact ? (narrowPhone ? 32 : 34) : 56}
              lineHeight={compact ? (narrowPhone ? 38 : 40) : 62}
              letterSpacing={compact ? -0.85 : -1.6}
            />
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
            {...(web ? ({ className: "campus-home-focus" } as object) : null)}
            style={({ pressed, hovered }: PressState) => [
              styles.cta,
              compact && styles.ctaCompact,
              !stacked && styles.ctaDesktop,
              styles.motion,
              (hovered || pressed) && styles.ctaHover,
            ]}
          >
            <LText style={[styles.ctaText, compact && styles.ctaTextCompact]}>
              Open tuition calculator
            </LText>
            <Ionicons name="arrow-forward" size={designSize(16)} color={Studently.color.ink} />
          </Pressable>
        </View>

        <View
          style={[
            styles.visual,
            stacked && !compact && styles.visualStacked,
            compact && styles.visualCompact,
            compact && narrowPhone && styles.visualCompactNarrow,
          ]}
        >
          <HeroCap />
        </View>
      </View>

      <View
        style={[
          styles.tools,
          compact && styles.toolsCompact,
          !stacked && styles.toolsDesktop,
        ]}
      >
        {!compact ? (
          <View
            style={[
              styles.divider,
              !stacked && styles.dividerDesktop,
            ]}
          />
        ) : null}

        <View
          style={[
            styles.cols,
            compact && styles.colsCompact,
            !stacked && styles.colsDesktop,
          ]}
        >
          {orderedTools.map((tool, i) => {
            const lastInRow = (i + 1) % perRow === 0;
            const lastRow = i >= orderedTools.length - perRow;

            if (compact) {
              const rowInner = (active: boolean) => (
                <>
                  <View
                    style={[
                      styles.mobileIconWell,
                      !tool.live && styles.mobileIconWellSoon,
                    ]}
                  >
                    <Ionicons
                      name={tool.icon}
                      size={20}
                      color={
                        tool.live
                          ? Studently.color.primary
                          : Studently.color.inkFaint
                      }
                    />
                  </View>
                  <View style={styles.mobileRowBody}>
                    <LText
                      variant="subtitle"
                      tone={tool.live ? undefined : "muted"}
                      style={styles.mobileRowTitle}
                    >
                      {tool.title}
                    </LText>
                    <LText
                      variant="caption"
                      tone="muted"
                      style={styles.mobileRowDesc}
                    >
                      {tool.body}
                    </LText>
                  </View>
                  {tool.live ? (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        active
                          ? Studently.color.primary
                          : Studently.color.inkFaint
                      }
                      style={styles.mobileRowChevron}
                    />
                  ) : null}
                </>
              );

              if (tool.live && tool.href) {
                return (
                  <Pressable
                    key={tool.id}
                    onPress={() => go(tool.href!)}
                    accessibilityRole="link"
                    accessibilityLabel={tool.title}
                    {...(web
                      ? ({ className: "campus-home-row-focus" } as object)
                      : null)}
                    style={({ pressed, hovered }: PressState) => [
                      styles.mobileRow,
                      !lastRow && styles.mobileRowRule,
                      styles.motion,
                      (hovered || pressed) && styles.mobileRowPressed,
                    ]}
                  >
                    {({ pressed, hovered }: PressState) =>
                      rowInner(Boolean(pressed || hovered))
                    }
                  </Pressable>
                );
              }

              return (
                <View
                  key={tool.id}
                  style={[
                    styles.mobileRow,
                    !lastRow && styles.mobileRowRule,
                    styles.colSoon,
                  ]}
                  accessibilityLabel={`${tool.title}, coming later`}
                >
                  {rowInner(false)}
                </View>
              );
            }

            const inner = (
              <>
                <Ionicons
                  name={tool.icon}
                  size={designSize(22)}
                  color={tool.live ? Studently.color.primary : Studently.color.inkFaint}
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
                  {...(web
                    ? ({ className: "campus-home-row-focus" } as object)
                    : null)}
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

const baseStyles = StyleSheet.create({
  page: {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 8,
  },
  pageCompact: {
    justifyContent: "flex-start",
    gap: 0,
  },
  pageDesktop: {
    gap: 0,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 48,
    width: "100%",
    flexGrow: 1,
    // Floor only — leftover viewport is absorbed here so the cap stays
    // large while empty letterbox above/below it shrinks.
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: HERO_DESKTOP,
    pointerEvents: "none",
  },
  rippleHost: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    pointerEvents: "auto",
  },
  heroStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    flexGrow: 0,
    gap: 28,
    minHeight: 0,
    paddingTop: 8,
    paddingBottom: 36,
  },
  heroCompact: {
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    gap: 16,
    paddingBottom: 20,
  },
  heroCompactBleed: {
    width: "auto" as unknown as number,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  copy: {
    flex: 1,
    maxWidth: 560,
    justifyContent: "center",
    gap: 22,
    minWidth: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  copyCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    justifyContent: "flex-start",
    maxWidth: "100%",
    width: "100%",
    gap: 14,
  },
  copyDesktop: {
    gap: 10,
  },
  copyRead: {
    gap: 18,
    pointerEvents: "none",
  },
  copyReadCompact: {
    gap: 8,
  },
  copyReadDesktop: {
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Studently.color.primary,
    pointerEvents: "auto",
  },
  badgeCompact: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: "#FFFFFF",
  },
  lede: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 460,
    alignSelf: "flex-start",
    pointerEvents: "auto",
  },
  ledeCompact: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: "100%",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Studently.color.ink,
    cursor: "pointer",
    pointerEvents: "auto",
  },
  ctaCompact: {
    alignSelf: "stretch",
    width: "100%",
    justifyContent: "center",
    marginTop: 2,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: Studently.color.surface,
  },
  ctaDesktop: {
    marginTop: 0,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  ctaHover: {
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.primaryMist,
  },
  ctaText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 18,
    color: Studently.color.ink,
  },
  ctaTextCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  visual: {
    flex: 1.4,
    minWidth: 0,
    minHeight: 220,
    maxWidth: 860,
    alignSelf: "stretch",
    zIndex: 1,
    pointerEvents: "none",
  },
  visualStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: HERO_STACKED_VISUAL,
    width: "100%",
    maxWidth: "100%",
    minHeight: HERO_STACKED_VISUAL,
    height: HERO_STACKED_VISUAL,
    alignSelf: "auto",
  },
  visualCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    height: 136,
    minHeight: 136,
    width: "100%",
    maxWidth: 236,
    alignSelf: "center",
  },
  visualCompactNarrow: {
    height: 120,
    minHeight: 120,
    maxWidth: 208,
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
  toolsCompact: {
    marginTop: 4,
  },
  toolsDesktop: {
    marginTop: -24,
  },
  // Rule sits above the tools with clear air before them.
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Studently.color.border,
    marginBottom: 24,
  },
  dividerDesktop: {
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
  colsCompact: {
    flexDirection: "column",
    flexWrap: "nowrap",
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 16,
    overflow: "hidden",
    paddingBottom: 0,
  },
  colsDesktop: {
    paddingBottom: 4,
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
  colRule: {
    borderRightWidth: 1,
    borderRightColor: Studently.color.border,
  },
  colRuleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Studently.color.border,
  },
  colHover: {
    backgroundColor: Studently.color.primaryMist,
  },
  colSoon: {
    cursor: "auto",
    opacity: 0.68,
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
  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 16,
    cursor: "pointer",
  },
  mobileRowRule: {
    borderBottomWidth: 1,
    borderBottomColor: Studently.color.bgWash,
  },
  mobileRowPressed: {
    backgroundColor: Studently.color.primaryMist,
  },
  mobileIconWell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Studently.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mobileIconWellSoon: {
    backgroundColor: Studently.color.surfaceMuted,
  },
  mobileRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mobileRowTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: Studently.type.bodySemi,
  },
  mobileRowDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  mobileRowChevron: {
    flexShrink: 0,
    marginLeft: 2,
  },
});
