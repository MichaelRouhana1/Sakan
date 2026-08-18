import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { WIZARD_STEPS } from "@/constants/listingWizard";

type Props = { step: number };

export function CreateProgress({ step }: Props) {
  const total = WIZARD_STEPS.length;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {WIZARD_STEPS.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.tick,
              i < step && styles.tickDone,
              i === step && styles.tickNow,
            ]}
          />
        ))}
      </View>
      <LText variant="caption" tone="muted" style={styles.count}>
        {step + 1} / {total}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  track: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  tick: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Lister.color.border,
  },
  tickDone: {
    backgroundColor: Lister.color.primary,
  },
  tickNow: {
    backgroundColor: Lister.color.primaryDeep,
  },
  count: {
    fontFamily: Lister.type.bodySemi,
    minWidth: 36,
    textAlign: "right",
  },
});
