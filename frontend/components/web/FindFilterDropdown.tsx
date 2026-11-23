import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { BudgetHistogramSlider } from "@/components/listings/BudgetHistogramSlider";
import { Studently } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import type { PriceHistogram } from "@/types/priceHistogram";

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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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
          hitSlop={designSize(8)}
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={designSize(16)} color={Studently.color.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Studently.color.inkFaint}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange("")}
          hitSlop={designSize(6)}
        >
          <Ionicons name="close-circle" size={designSize(16)} color={Studently.color.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function BudgetRangeControl({
  minRentUsd,
  maxRentUsd,
  histogram,
  onChange,
}: {
  minRentUsd: number | null;
  maxRentUsd: number | null;
  histogram?: PriceHistogram | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  return (
    <BudgetHistogramSlider
      compact
      minRentUsd={minRentUsd}
      maxRentUsd={maxRentUsd}
      histogram={histogram}
      onCommit={onChange}
    />
  );
}

const baseStyles = StyleSheet.create({
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
    color: Studently.color.ink,
  },
  reset: {
    color: Studently.color.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  resetOff: {
    color: Studently.color.inkFaint,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  rowHover: {
    backgroundColor: Studently.color.surfaceMuted,
    marginHorizontal: -8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowLabel: {
    fontSize: 15,
    color: Studently.color.ink,
  },
  rowLabelOn: {
    fontWeight: "700",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: "#FFFFFF",
  },
  chipOn: {
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.primaryMist,
  },
  chipHover: {
    backgroundColor: Studently.color.surfaceMuted,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Studently.color.ink,
  },
  chipLabelOn: {
    color: Studently.color.primaryDeep,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Studently.color.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Studently.color.ink,
    outlineStyle: "none",
    paddingVertical: 0,
  } as Record<string, unknown>,
});
