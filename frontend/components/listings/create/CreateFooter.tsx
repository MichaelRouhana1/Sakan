import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { Lister } from "@/constants/listerTheme";

type Props = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
  /** No top border — used when progress strip sits above. */
  borderless?: boolean;
};

export function CreateFooter({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextLoading,
  hideBack,
  hideNext,
  borderless,
}: Props) {
  return (
    <View style={[styles.bar, borderless && styles.barBorderless]}>
      <View style={styles.row}>
        {hideBack ? (
          <View />
        ) : borderless ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => onBack?.()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        ) : (
          <LButton
            label="Back"
            variant="ghost"
            onPress={() => onBack?.()}
            style={styles.back}
          />
        )}
        {hideNext ? (
          <View />
        ) : borderless ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            disabled={nextDisabled || nextLoading}
            onPress={onNext}
            style={[
              styles.nextPill,
              (nextDisabled || nextLoading) && styles.nextPillDisabled,
            ]}
          >
            <Text style={styles.nextPillText}>
              {nextLoading ? "…" : nextLabel}
            </Text>
          </Pressable>
        ) : (
          <LButton
            label={nextLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={nextLoading}
            style={styles.next}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Lister.space.lg,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Lister.color.surface,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
    zIndex: 10,
  },
  barBorderless: {
    borderTopWidth: 0,
    paddingTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
  },
  back: { minWidth: 88 },
  next: { minWidth: 168, paddingHorizontal: 28 },
  backLink: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  backLinkText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    color: Lister.color.ink,
    textDecorationLine: "underline",
  },
  nextPill: {
    minWidth: 100,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  nextPillDisabled: {
    opacity: 0.45,
  },
  nextPillText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    color: "#FFFFFF",
  },
});
