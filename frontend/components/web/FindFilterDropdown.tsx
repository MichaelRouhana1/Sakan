import { Ionicons } from "@expo/vector-icons";
import { createElement, useEffect, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";

export const FILTER_BAR_HEIGHT = 52;

type Anchor = { top: number; left: number };

type ShellProps = {
  title: string;
  width?: number;
  anchor: Anchor;
  canReset: boolean;
  onReset: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function FilterDropdownBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Close filter menu"
      onPress={onClose}
      style={styles.backdrop}
    />
  );
}

export function FilterDropdownShell({
  title,
  width = 300,
  anchor,
  canReset,
  onReset,
  onClose,
  children,
}: ShellProps) {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <View
      style={[
        styles.card,
        {
          top: anchor.top,
          left: anchor.left,
          width,
        },
      ]}
    >
      <View style={styles.header}>
        <LText variant="subtitle" style={styles.title}>
          {title}
        </LText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canReset }}
          disabled={!canReset}
          onPress={onReset}
          hitSlop={8}
        >
          <LText
            variant="caption"
            style={[styles.reset, !canReset && styles.resetOff]}
          >
            Reset
          </LText>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export function MenuRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ hovered }) => [styles.row, hovered && styles.rowHover]}
    >
      <LText
        variant="body"
        style={[styles.rowLabel, selected && styles.rowLabelOn]}
        numberOfLines={1}
      >
        {label}
      </LText>
    </Pressable>
  );
}

export function MenuChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ hovered }) => [
        styles.chip,
        selected && styles.chipOn,
        hovered && !selected && styles.chipHover,
      ]}
    >
      <LText
        variant="caption"
        style={[styles.chipLabel, selected && styles.chipLabelOn]}
      >
        {label}
      </LText>
    </Pressable>
  );
}

export function MenuSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={16} color={Skoun.color.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Skoun.color.inkFaint}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange("")}
          hitSlop={6}
        >
          <Ionicons name="close-circle" size={16} color={Skoun.color.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const RENT_MIN = 0;
const RENT_MAX = 2500;
const RENT_STEP = 25;

export function BudgetRangeControl({
  minRentUsd,
  maxRentUsd,
  onChange,
}: {
  minRentUsd: number | null;
  maxRentUsd: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const lo = minRentUsd ?? RENT_MIN;
  const hi = maxRentUsd ?? RENT_MAX;

  const commit = (nextLo: number, nextHi: number) => {
    const clampedLo = Math.min(nextLo, nextHi);
    const clampedHi = Math.max(nextLo, nextHi);
    onChange(
      clampedLo <= RENT_MIN ? null : clampedLo,
      clampedHi >= RENT_MAX ? null : clampedHi,
    );
  };

  return (
    <View style={styles.budget}>
      <View style={styles.budgetCaps}>
        <LText variant="caption" style={styles.budgetCap}>
          Minimum
        </LText>
        <LText variant="caption" style={styles.budgetCap}>
          Maximum
        </LText>
      </View>
      {Platform.OS === "web" ? (
        <View style={styles.sliderTrack}>
          {createElement("style", {
            dangerouslySetInnerHTML: {
              __html: `
                input[data-skoun-range]::-webkit-slider-runnable-track {
                  background: transparent;
                  height: 4px;
                }
                input[data-skoun-range]::-moz-range-track {
                  background: transparent;
                  height: 4px;
                  border: none;
                }
                input[data-skoun-range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  margin-top: -6px;
                  border-radius: 50%;
                  background: ${Skoun.color.primary};
                  border: 2px solid #ffffff;
                  box-shadow: 0 1px 4px rgba(18, 24, 38, 0.28);
                  cursor: pointer;
                }
                input[data-skoun-range]::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: ${Skoun.color.primary};
                  border: 2px solid #ffffff;
                  box-shadow: 0 1px 4px rgba(18, 24, 38, 0.28);
                  cursor: pointer;
                }
              `,
            },
          })}
          <View style={styles.sliderRail} />
          <View
            style={[
              styles.sliderFill,
              {
                left: `${((lo - RENT_MIN) / (RENT_MAX - RENT_MIN)) * 100}%`,
                width: `${((hi - lo) / (RENT_MAX - RENT_MIN)) * 100}%`,
              },
            ]}
          />
          {createElement("input", {
            type: "range",
            min: RENT_MIN,
            max: RENT_MAX,
            step: RENT_STEP,
            value: lo,
            "data-skoun-range": "true",
            onChange: (e: { target: { value: string } }) =>
              commit(Number(e.target.value), hi),
            style: webRangeStyle("low"),
          })}
          {createElement("input", {
            type: "range",
            min: RENT_MIN,
            max: RENT_MAX,
            step: RENT_STEP,
            value: hi,
            "data-skoun-range": "true",
            onChange: (e: { target: { value: string } }) =>
              commit(lo, Number(e.target.value)),
            style: webRangeStyle("high"),
          })}
        </View>
      ) : null}
      <View style={styles.budgetPills}>
        <View style={styles.budgetPill}>
          <LText variant="caption" style={styles.budgetDollar}>
            $
          </LText>
          <TextInput
            value={String(lo)}
            keyboardType="number-pad"
            onChangeText={(raw) => {
              const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
              if (!Number.isFinite(n)) return;
              commit(n, hi);
            }}
            style={styles.budgetInput}
          />
        </View>
        <View style={styles.budgetPill}>
          <LText variant="caption" style={styles.budgetDollar}>
            $
          </LText>
          <TextInput
            value={hi >= RENT_MAX ? `${RENT_MAX}+` : String(hi)}
            keyboardType="number-pad"
            onChangeText={(raw) => {
              const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
              if (!Number.isFinite(n)) return;
              commit(lo, n);
            }}
            style={styles.budgetInput}
          />
        </View>
      </View>
    </View>
  );
}

function webRangeStyle(layer: "low" | "high"): Record<string, string | number> {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    height: 28,
    margin: 0,
    background: "transparent",
    pointerEvents: "auto",
    zIndex: layer === "high" ? 2 : 1,
    accentColor: Skoun.color.primary,
    WebkitAppearance: "none",
    appearance: "none",
  };
}

const styles = StyleSheet.create({
  backdrop: {
    position: "fixed" as unknown as "absolute",
    top: WEB_NAV_HEIGHT + FILTER_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
  card: {
    position: "fixed" as unknown as "absolute",
    zIndex: 90,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
    maxHeight: 420,
    boxShadow: "0 8px 28px rgba(18, 24, 38, 0.14)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Skoun.color.ink,
  },
  reset: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  resetOff: {
    color: Skoun.color.inkFaint,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  rowHover: {
    backgroundColor: Skoun.color.surfaceMuted,
    marginHorizontal: -8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowLabel: {
    fontSize: 15,
    color: Skoun.color.ink,
  },
  rowLabelOn: {
    fontWeight: "700",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: "#FFFFFF",
  },
  chipOn: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  chipHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Skoun.color.ink,
  },
  chipLabelOn: {
    color: Skoun.color.primaryDeep,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Skoun.color.ink,
    outlineStyle: "none",
    paddingVertical: 0,
  } as Record<string, unknown>,
  budget: {
    gap: 12,
  },
  budgetCaps: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetCap: {
    color: Skoun.color.inkFaint,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sliderTrack: {
    height: 28,
    justifyContent: "center",
    marginHorizontal: 2,
    position: "relative",
  },
  sliderRail: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  sliderFill: {
    position: "absolute",
    height: 4,
    borderRadius: 999,
    backgroundColor: Skoun.color.primary,
  },
  budgetPills: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  budgetPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  budgetDollar: {
    color: Skoun.color.inkMuted,
    fontWeight: "700",
  },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Skoun.color.ink,
    outlineStyle: "none",
    paddingVertical: 0,
  } as Record<string, unknown>,
});
