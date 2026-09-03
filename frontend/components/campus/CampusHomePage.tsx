import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Tool = {
  id: string;
  live: boolean;
  href?: string;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  gradient: readonly [string, string, string];
};

const TOOLS: readonly Tool[] = [
  {
    id: "calculator",
    live: true,
    href: "/campus/calculator",
    title: "Tuition calculator",
    body: "Estimate a major’s total tuition, cost per year and per semester, in USD.",
    icon: "calculator-outline",
    gradient: ["#EAF1FC", "#FFFFFF", "#F7F9FC"],
  },
  {
    id: "universities",
    live: false,
    title: "Universities",
    body: "Campuses, faculties, buildings, and amenities.",
    icon: "school-outline",
    gradient: ["#EEF1F5", "#F5F7FA", "#F8F9FB"],
  },
  {
    id: "calendar",
    live: true,
    href: "/campus/calendar",
    title: "Academic calendar",
    body: "Official Lebanese holidays — the days campuses close.",
    icon: "calendar-outline",
    gradient: ["#E6EEFA", "#FFFFFF", "#F5F7FA"],
  },
  {
    id: "benefits",
    live: true,
    href: "/campus/benefits",
    title: "Student benefits",
    body: "Verified student discounts on software, food, transport, and telecom — plus campus-only offers.",
    icon: "pricetag-outline",
    gradient: ["#E6EEFA", "#FFFFFF", "#F5F7FA"],
  },
];

export function CampusHomePage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const uni =
    user?.campus?.institutionShortName?.trim() ||
    user?.campus?.institutionName?.trim() ||
    null;

  const twoCol = width >= 900;

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <View style={styles.heroRule} />
        <LText variant="label" tone="muted" style={styles.kicker}>
          {uni ? `Your campus · ${uni}` : "Student tools · Lebanon"}
        </LText>
        <LText variant="display" style={styles.title}>
          {uni ? `Your ${uni} student home` : "Your student home"}
        </LText>
        <LText variant="body" tone="muted" style={styles.lede}>
          {uni
            ? `Free tools for ${uni} students — tuition, calendar, benefits, and housing nearby.`
            : "Free tools for your university — tuition, calendar, benefits, and housing nearby."}
        </LText>
      </View>

      <View style={styles.grid}>
        {TOOLS.map((tool) => {
          const inner = (
            <LinearGradient
              colors={[...tool.gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardFill}
            >
              <View style={styles.cardOrb} pointerEvents="none" />
              <View style={styles.cardTop}>
                <View
                  style={[styles.iconWell, !tool.live && styles.iconWellSoon]}
                >
                  <Ionicons
                    name={tool.icon}
                    size={22}
                    color={
                      tool.live ? Skoun.color.primary : Skoun.color.inkFaint
                    }
                  />
                </View>
                {tool.live ? (
                  <View style={styles.arrowWell}>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={Skoun.color.primary}
                    />
                  </View>
                ) : null}
              </View>
              <LText
                variant="subtitle"
                tone={tool.live ? undefined : "muted"}
                style={styles.cardTitle}
              >
                {tool.title}
              </LText>
              <LText variant="caption" tone="muted" style={styles.cardBody}>
                {tool.body}
              </LText>
            </LinearGradient>
          );

          const shellStyle = [
            styles.card,
            twoCol ? styles.cardHalf : styles.cardFull,
            !tool.live && styles.cardSoon,
          ];

          if (tool.live && tool.href) {
            return (
              <Pressable
                key={tool.id}
                onPress={() => router.push(tool.href as never)}
                accessibilityRole="link"
                accessibilityLabel={tool.title}
                style={({ pressed, hovered }) => [
                  ...shellStyle,
                  !reduced && styles.cardMotion,
                  hovered && styles.cardHover,
                  pressed && styles.pressed,
                ]}
              >
                {inner}
              </Pressable>
            );
          }

          return (
            <View
              key={tool.id}
              style={shellStyle}
              accessibilityLabel={`${tool.title}, coming later`}
            >
              {inner}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 28,
    width: "100%",
    maxWidth: 880,
    alignSelf: "center",
  },
  hero: {
    gap: 10,
    maxWidth: 640,
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
  },
  heroRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Skoun.color.primary,
    marginBottom: 2,
  },
  kicker: {
    letterSpacing: 0.6,
    textAlign: "center",
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
    justifyContent: "center",
  },
  card: {
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: "#D5DCE7",
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    cursor: "pointer",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 2px 8px rgba(18, 24, 38, 0.05)",
        } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
        }),
  },
  cardHalf: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48.8%",
    minWidth: 280,
  },
  cardFull: {
    width: "100%",
  },
  cardFill: {
    minHeight: 176,
    paddingVertical: 22,
    paddingHorizontal: 22,
    gap: 12,
    overflow: "hidden",
  },
  cardOrb: {
    position: "absolute",
    top: -56,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(47, 111, 237, 0.09)",
  },
  cardMotion:
    Platform.OS === "web"
      ? ({
          transitionProperty: "transform, box-shadow, border-color",
          transitionDuration: "200ms",
          transitionTimingFunction: "ease",
        } as object)
      : {},
  cardHover:
    Platform.OS === "web"
      ? ({
          borderColor: Skoun.color.primarySoft,
          transform: [{ translateY: -3 }],
          boxShadow: "0 16px 36px rgba(18, 24, 38, 0.11)",
        } as object)
      : {
          borderColor: Skoun.color.primarySoft,
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 4,
        },
  cardSoon: {
    cursor: "default",
    borderColor: "#DCE2EA",
  },
  pressed: {
    opacity: 0.92,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4E0F4",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 4px 14px rgba(47, 111, 237, 0.1)",
        } as object)
      : null),
  },
  iconWellSoon: {
    backgroundColor: Skoun.color.surfaceMuted,
    borderColor: "#D5DBE4",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "none",
        } as object)
      : null),
  },
  arrowWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "#D9E3F4",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    zIndex: 1,
    fontSize: 18,
    lineHeight: 24,
  },
  cardBody: {
    zIndex: 1,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 360,
  },
});
