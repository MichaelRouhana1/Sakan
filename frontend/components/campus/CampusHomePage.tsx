import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

const TOOLS = [
  {
    id: "calculator",
    live: true,
    href: "/campus/calculator",
    title: "Tuition calculator",
    body: "Estimate a major’s total tuition, cost per year and per semester, in USD.",
    icon: "calculator-outline" as const,
  },
  {
    id: "universities",
    live: false,
    title: "Universities",
    body: "Campuses, faculties, buildings, and amenities.",
    icon: "school-outline" as const,
  },
  {
    id: "calendar",
    live: true,
    href: "/campus/calendar",
    title: "Academic calendar",
    body: "Official Lebanese holidays — the days campuses close.",
    icon: "calendar-outline" as const,
  },
  {
    id: "benefits",
    live: false,
    title: "Student benefits",
    body: "Discounts and student services.",
    icon: "pricetag-outline" as const,
  },
] as const;

export function CampusHomePage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const uni =
    user?.campus?.institutionShortName?.trim() ||
    user?.campus?.institutionName?.trim() ||
    null;

  return (
    <View style={styles.page}>
      <LText variant="label" tone="muted">
        {uni ? `Your campus · ${uni}` : "Student tools · Lebanon"}
      </LText>
      <LText variant="display" style={styles.title}>
        {uni ? `Your ${uni} student home` : "Your student home"}
      </LText>
      <LText variant="body" tone="muted" style={styles.lede}>
        {uni
          ? `Free tools for ${uni} students — tuition, calendar, benefits, and housing nearby. Skoun builds this to simplify campus life.`
          : "Free tools for your university — tuition, calendar, benefits, and housing nearby. Skoun builds this to simplify campus life."}
      </LText>

      <View style={styles.grid}>
        {TOOLS.map((tool) =>
          tool.live ? (
            <Pressable
              key={tool.id}
              onPress={() => router.push(tool.href as never)}
              accessibilityRole="link"
              accessibilityLabel={tool.title}
              style={({ pressed, hovered }) => [
                styles.card,
                hovered && styles.cardHover,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconWell}>
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={Skoun.color.primary}
                />
              </View>
              <LText variant="subtitle">{tool.title}</LText>
              <LText variant="caption" tone="muted" style={styles.cardBody}>
                {tool.body}
              </LText>
              <View style={styles.livePill}>
                <LText variant="label" style={styles.livePillText}>
                  Available now
                </LText>
              </View>
            </Pressable>
          ) : (
            <View
              key={tool.id}
              style={[styles.card, styles.cardSoon]}
              accessibilityLabel={`${tool.title}, coming later`}
            >
              <View style={[styles.iconWell, styles.iconWellSoon]}>
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={Skoun.color.inkFaint}
                />
              </View>
              <LText variant="subtitle" tone="muted">
                {tool.title}
              </LText>
              <LText variant="caption" tone="muted" style={styles.cardBody}>
                {tool.body}
              </LText>
              <View style={styles.soonPill}>
                <LText variant="label" tone="muted">
                  Coming
                </LText>
              </View>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 12,
    maxWidth: 960,
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.6,
    maxWidth: 640,
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: 280,
    minHeight: 216,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    padding: 20,
    gap: 10,
    cursor: "pointer",
  },
  cardHover: {
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderColor: Skoun.color.primarySoft,
  },
  cardSoon: {
    backgroundColor: Skoun.color.surfaceMuted,
    cursor: "default",
  },
  pressed: {
    opacity: 0.88,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWellSoon: {
    backgroundColor: Skoun.color.bgWash,
  },
  cardBody: {
    flexGrow: 1,
  },
  livePill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5EE",
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  livePillText: {
    color: "#1B7A4A",
  },
  soonPill: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.bgWash,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
