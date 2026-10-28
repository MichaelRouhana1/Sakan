import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";

export type DetailSectionId =
  | "description"
  | "amenities"
  | "rooms"
  | "rules"
  | "map"
  | "nearby";

export type DetailSectionTab = {
  id: DetailSectionId;
  label: string;
};

type Props = {
  tabs: DetailSectionTab[];
  activeId: DetailSectionId | null;
  onJump: (id: DetailSectionId) => void;
};

export function ListingDetailSectionTabs({ tabs, activeId, onJump }: Props) {
  if (tabs.length === 0) return null;

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const on = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onJump(tab.id)}
              style={styles.tab}
            >
              <LText
                variant="subtitle"
                style={[styles.label, on && styles.labelOn]}
              >
                {tab.label}
              </LText>
              <View style={[styles.underline, on && styles.underlineOn]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Studently.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studently.color.border,
  },
  row: {
    paddingHorizontal: 8,
    minHeight: 46,
  },
  tab: {
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: Studently.color.inkMuted,
    fontFamily: Studently.type.bodyMedium,
  },
  labelOn: {
    color: Studently.color.primary,
    fontFamily: Studently.type.bodySemi,
  },
  underline: {
    marginTop: 10,
    height: 3,
    width: "100%",
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  underlineOn: {
    backgroundColor: Studently.color.primary,
  },
});
