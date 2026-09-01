import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

const TOOLS = [
  {
    id: "calculator",
    live: true,
    href: "/campus/calculator",
    title: "Tuition calculator",
    body: "Semester and year cost in USD — AUB, LAU, USJ, UA, NDU, USEK, BAU, UOB, LIU, ULS, MEU, Haigazian, Makassed, Jinan, Global, AOU, RHU, AUST, AUT, MUBS, LCU, ULF, Sainte Famille, UT, USAL, Phoenicia, Maaref, and Azm have live figures; other unis are in the catalog waiting on sources.",
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
    live: false,
    title: "Academic calendar",
    body: "Term dates, holidays, registration windows.",
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

  return (
    <View style={styles.page}>
      <LText variant="label" tone="muted">
        Student tools · Lebanon
      </LText>
      <LText variant="display" style={styles.title}>
        Useful all year — not only when you need a room.
      </LText>
      <LText variant="body" tone="muted" style={styles.lede}>
        Estimate what a major costs at a private university, then open live
        listings near that campus. Housing stays on Skoun; Campus is the rest
        of the year.
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
              <LText variant="caption" tone="primary" style={styles.cardCta}>
                Open calculator
              </LText>
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
  cardCta: {
    fontFamily: Skoun.type.bodySemi,
    textDecorationLine: "underline",
  },
  soonPill: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.bgWash,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
