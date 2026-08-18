import { StyleSheet, View } from "react-native";
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
};

export function CreateFooter({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextLoading,
  hideBack,
  hideNext,
}: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {hideBack ? (
          <View />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
  },
  back: { minWidth: 88 },
  next: { minWidth: 168, paddingHorizontal: 28 },
});
