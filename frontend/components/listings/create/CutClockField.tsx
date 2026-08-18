import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import {
  clockToHHMM,
  hhmmToClock,
  type Meridiem,
} from "@/lib/electricityCuts";

type Props = {
  label: string;
  value: string;
  error?: boolean;
  defaultMeridiem: Meridiem;
  onChange: (hhmm: string) => void;
};

export function CutClockField({
  label,
  value,
  error,
  defaultMeridiem,
  onChange,
}: Props) {
  const parsed = hhmmToClock(value);
  const meridiem = parsed?.meridiem ?? defaultMeridiem;
  const [hourDraft, setHourDraft] = useState(parsed?.hour ?? "");

  useEffect(() => {
    if (parsed?.hour) setHourDraft(parsed.hour);
  }, [parsed?.hour]);

  function commit(hour: string, nextMeridiem: Meridiem) {
    const hhmm = clockToHHMM(hour, nextMeridiem);
    if (hhmm) onChange(hhmm);
  }

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <LText variant="caption" tone="muted">
        {label}
      </LText>
      <View style={[styles.row, error && styles.rowError]}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          placeholder="6"
          placeholderTextColor={Lister.color.inkFaint}
          value={hourDraft}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, "").slice(0, 2);
            setHourDraft(digits);
            commit(digits, meridiem);
          }}
          style={styles.hour}
          maxLength={2}
        />
        <View style={styles.ampm}>
          {(["am", "pm"] as const).map((m) => {
            const on = meridiem === m && Boolean(parsed);
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => commit(hourDraft || "6", m)}
                style={[styles.ampmBtn, on && styles.ampmOn]}
              >
                <LText
                  variant="caption"
                  style={on ? styles.ampmTextOn : styles.ampmText}
                >
                  {m.toUpperCase()}
                </LText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    padding: 4,
  },
  rowError: {
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  hour: {
    width: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontFamily: Lister.type.bodySemi,
    fontSize: 18,
    color: Lister.color.ink,
    textAlign: "center",
  },
  ampm: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  ampmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: Lister.radius.sm,
  },
  ampmOn: {
    backgroundColor: Lister.color.primary,
  },
  ampmText: {
    color: Lister.color.inkMuted,
    fontFamily: Lister.type.bodySemi,
  },
  ampmTextOn: {
    color: "#FFFFFF",
    fontFamily: Lister.type.bodySemi,
  },
});
