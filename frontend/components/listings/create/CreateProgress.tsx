import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { WIZARD_STEPS } from "@/constants/listingWizard";

type Props = {
  step: number;
  /** Footer strip: ticks only, no step count. */
  variant?: "header" | "footer";
};

export function CreateProgress({ step, variant = "header" }: Props) {
  const total = WIZARD_STEPS.length;
  const footer = variant === "footer";

  return (
    <View style={[styles.wrap, footer && styles.wrapFooter]}>
      <View style={styles.track}>
        {WIZARD_STEPS.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.tick,
              footer && styles.tickFooter,
              i < step && (footer ? styles.tickDoneFooter : styles.tickDone),
              i === step &&
                (footer ? styles.tickNowFooter : styles.tickNow),
            ]}
          />
        ))}
      </View>
      {!footer ? (
        <LText variant="caption" tone="muted" style={styles.count}>
          {step + 1} / {total}
        </LText>
      ) : null}
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
  wrapFooter: {
    flex: 0,
    width: "100%",
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
  tickFooter: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#DDDDDD",
  },
  tickDone: {
    backgroundColor: Lister.color.primary,
  },
  tickNow: {
    backgroundColor: Lister.color.primaryDeep,
  },
  tickDoneFooter: {
    backgroundColor: "#222222",
  },
  tickNowFooter: {
    backgroundColor: "#222222",
  },
  count: {
    fontFamily: Lister.type.bodySemi,
    minWidth: 36,
    textAlign: "right",
  },
});
