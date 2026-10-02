import { Pressable, ScrollView, StyleSheet } from "react-native";
import { LText } from "@/components/lister/Typography";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { chipLabel } from "@/components/listings/edit/sectionChipLabel";

export { chipLabel };

type Props = {
  activeId: string;
  onSelect: (id: string) => void;
};

export function SectionPills({ activeId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.row}
    >
      {WIZARD_STEPS.map((step) => {
        const on = step.id === activeId;
        return (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(step.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <LText variant="caption" style={on ? styles.labelOn : undefined}>
              {chipLabel(step.id)}
            </LText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
  },
  row: {
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 2,
  },
  chip: {
    borderRadius: Lister.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.primaryMist,
  },
  chipOn: {
    backgroundColor: Lister.color.ink,
    borderColor: Lister.color.ink,
  },
  labelOn: {
    color: Lister.color.surface,
  },
});
