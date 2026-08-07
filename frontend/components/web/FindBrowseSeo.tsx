import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { LEBANON_AREAS } from "@/constants/areas";
import { Skoun } from "@/constants/theme";

const FAQS = [
  {
    q: "How does Skoun work for finding a room in Lebanon?",
    a: "Browse listings by area or university campus, open a room you like, then message the poster on WhatsApp. Skoun is a classifieds layer — we don’t take booking deposits or act as the landlord.",
  },
  {
    q: "Are prices in USD or LBP?",
    a: "Listings show monthly rent in fresh USD. Always confirm what’s included (electricity, water, generator, Wi‑Fi) and how payment works before you commit.",
  },
  {
    q: "Can I filter near AUB, LAU, or USJ?",
    a: "Yes. Switch to Near campus mode, pick your university, and results sort by distance to campus. You can still filter by budget and utilities.",
  },
  {
    q: "Is it free to list a room?",
    a: "Yes. Posters can create a listing without paying Skoun. Renters browse and contact for free.",
  },
  {
    q: "Which areas are covered?",
    a: "Skoun focuses on Lebanon — starting with Beirut corridors students actually search: Hamra, Ras Beirut, Ashrafieh, Achrafieh, Bliss, and nearby neighbourhoods.",
  },
] as const;

const NEARBY_CITIES = [
  "Beirut",
  "Tripoli",
  "Sidon",
  "Byblos",
  "Zahle",
  "Jounieh",
] as const;

const NEARBY_UNIS = [
  "AUB",
  "LAU Beirut",
  "USJ",
  "NDU",
  "BAU",
  "LAU Byblos",
] as const;

type Tab = "areas" | "cities" | "universities";

type Props = {
  cityLabel: string;
  onSelectArea?: (area: string) => void;
};

export function FindBrowseSeo({ cityLabel, onSelectArea }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [tab, setTab] = useState<Tab>("areas");
  const [showAllFaq, setShowAllFaq] = useState(false);

  const visibleFaqs = showAllFaq ? FAQS : FAQS.slice(0, 3);

  const tabLinks =
    tab === "areas"
      ? LEBANON_AREAS.slice(0, 12)
      : tab === "cities"
        ? [...NEARBY_CITIES]
        : [...NEARBY_UNIS];

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <LText variant="title" style={styles.h2}>
          Frequently asked questions
        </LText>
        <View style={styles.faqList}>
          {visibleFaqs.map((item, i) => {
            const open = openFaq === i;
            return (
              <View key={item.q} style={styles.faqItem}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenFaq(open ? null : i)}
                  style={({ hovered }) => [
                    styles.faqHeader,
                    hovered && styles.faqHeaderHover,
                  ]}
                >
                  <LText variant="label" style={styles.faqQ}>
                    {item.q}
                  </LText>
                  <LText variant="caption" style={styles.faqChevron}>
                    {open ? "−" : "+"}
                  </LText>
                </Pressable>
                {open ? (
                  <LText variant="body" style={styles.faqA}>
                    {item.a}
                  </LText>
                ) : null}
              </View>
            );
          })}
        </View>
        {!showAllFaq && FAQS.length > 3 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAllFaq(true)}
            style={styles.moreLink}
          >
            <LText variant="caption" style={styles.moreLabel}>
              View all questions ({FAQS.length})
            </LText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <LText variant="title" style={styles.h2}>
          Nearby in Lebanon
        </LText>
        <LText variant="caption" style={styles.seoLead}>
          Student rooms and shared flats around {cityLabel} — browse areas,
          cities, or campuses.
        </LText>
        <View style={styles.tabs}>
          {(
            [
              ["areas", "Areas"],
              ["cities", "Cities"],
              ["universities", "Universities"],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              onPress={() => setTab(id)}
              style={[styles.tab, tab === id && styles.tabActive]}
            >
              <LText
                variant="caption"
                style={[styles.tabLabel, tab === id && styles.tabLabelActive]}
              >
                {label}
              </LText>
            </Pressable>
          ))}
        </View>
        <View style={styles.linkGrid}>
          {tabLinks.map((name) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => {
                if (tab === "areas" && onSelectArea) onSelectArea(name);
              }}
              style={({ hovered }) => [
                styles.linkChip,
                hovered && styles.linkChipHover,
              ]}
            >
              <LText variant="caption" style={styles.linkText}>
                {tab === "universities"
                  ? `Near ${name}`
                  : `Student rooms in ${name}`}
              </LText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 40,
    paddingTop: 8,
    paddingBottom: 24,
  },
  section: {
    gap: 14,
  },
  h2: {
    fontSize: 22,
    fontWeight: "800",
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  seoLead: {
    color: Skoun.color.inkMuted,
    lineHeight: 20,
    maxWidth: 640,
  },
  faqList: {
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    backgroundColor: Skoun.color.surface,
    overflow: "hidden",
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  faqHeaderHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  faqQ: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Skoun.color.ink,
    lineHeight: 20,
  },
  faqChevron: {
    fontSize: 18,
    color: Skoun.color.primary,
    fontWeight: "700",
  },
  faqA: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    color: Skoun.color.inkMuted,
    lineHeight: 22,
    fontSize: 14,
  },
  moreLink: {
    alignSelf: "flex-start",
  },
  moreLabel: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  tabActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  tabLabel: {
    fontWeight: "600",
    color: Skoun.color.inkMuted,
    fontSize: 13,
  },
  tabLabelActive: {
    color: Skoun.color.primaryDeep,
  },
  linkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  linkChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  linkChipHover: {
    backgroundColor: Skoun.color.primaryMist,
  },
  linkText: {
    color: Skoun.color.ink,
    fontSize: 13,
    fontWeight: "500",
  },
});
