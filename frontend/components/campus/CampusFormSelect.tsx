import { Ionicons } from "@expo/vector-icons";
import { useEffect, useId, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Skoun } from "@/constants/theme";

export type CampusFormOption = {
  value: string;
  label: string;
  /** Secondary line in the menu (e.g. full university name). */
  detail?: string;
};

type Props = {
  label: string;
  value: string;
  options: CampusFormOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  accessibilityLabel?: string;
  onChange: (value: string) => void;
};

export function CampusFormSelect({
  label,
  value,
  options,
  placeholder = "Select…",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search…",
  accessibilityLabel,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const { height: windowHeight } = useWindowDimensions();
  const selected = options.find((row) => row.value === value);
  const a11y = accessibilityLabel ?? label;
  const singleOnly = options.length === 1;
  const sole = singleOnly ? options[0] : null;
  const display = sole ?? selected;
  const canOpen = !disabled && options.length > 1;
  const panelMaxHeight = Math.min(420, Math.round(windowHeight * 0.7));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        (row.detail?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  // Lock in the only available choice — no picker needed.
  useEffect(() => {
    if (!sole || disabled) return;
    if (value === sole.value) return;
    onChange(sole.value);
    // Intentionally omit onChange: parent handlers are often inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sole?.value, value, disabled]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  if (singleOnly && !disabled) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={styles.locked}
          accessibilityRole="text"
          accessibilityLabel={`${a11y}: ${display?.label ?? ""}`}
        >
          <View style={styles.lockedIcon}>
            <Ionicons name="checkmark" size={14} color={Skoun.color.primary} />
          </View>
          <View style={styles.triggerCopy}>
            <Text style={styles.triggerValue} numberOfLines={2}>
              {display?.label}
            </Text>
            {display?.detail ? (
              <Text style={styles.triggerDetail} numberOfLines={2}>
                {display.detail}
              </Text>
            ) : null}
          </View>
          <Text style={styles.lockedBadge}>Only option</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={!canOpen}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: !canOpen, expanded: open }}
        style={[
          styles.trigger,
          selected ? styles.triggerFilled : null,
          open ? styles.triggerOpen : null,
          !canOpen ? styles.triggerDisabled : null,
        ]}
      >
        <View style={styles.triggerCopy}>
          <Text
            style={[
              styles.triggerValue,
              !selected && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selected?.label ?? placeholder}
          </Text>
          {selected?.detail ? (
            <Text style={styles.triggerDetail} numberOfLines={1}>
              {selected.detail}
            </Text>
          ) : null}
        </View>
        {canOpen ? (
          <View style={[styles.chevronWrap, open && styles.chevronWrapOpen]}>
            <Ionicons
              name="chevron-down"
              size={16}
              color={
                open || selected ? Skoun.color.primary : Skoun.color.inkMuted
              }
            />
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        >
          <Pressable
            style={[
              styles.panel,
              Platform.OS === "web" ? styles.panelWeb : styles.panelNative,
              { maxHeight: panelMaxHeight },
            ]}
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="menu"
            nativeID={listId}
          >
            {Platform.OS !== "web" ? <View style={styles.sheetHandle} /> : null}
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{label}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color={Skoun.color.inkMuted} />
              </Pressable>
            </View>

            {searchable ? (
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={Skoun.color.inkFaint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={Skoun.color.inkFaint}
                  autoFocus={Platform.OS === "web"}
                  accessibilityLabel={searchPlaceholder}
                  style={styles.searchInput}
                />
                {query ? (
                  <Pressable
                    onPress={() => setQuery("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={Skoun.color.inkFaint}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(row) => row.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>No matches</Text>
              }
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <Pressable
                    onPress={() => pick(item.value)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: on }}
                    style={[styles.option, on && styles.optionOn]}
                  >
                    <View style={styles.optionCopy}>
                      <Text
                        style={[
                          styles.optionLabel,
                          on && styles.optionLabelOn,
                        ]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      {item.detail ? (
                        <Text style={styles.optionDetail} numberOfLines={2}>
                          {item.detail}
                        </Text>
                      ) : null}
                    </View>
                    {on ? (
                      <View style={styles.checkBadge}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#fff"
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: Skoun.color.inkMuted,
  },
  trigger: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
  },
  triggerOpen: {
    borderColor: Skoun.color.primary,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: `0 0 0 3px ${Skoun.color.primaryMist}`,
        } as object)
      : null),
  },
  triggerFilled: {
    borderColor: "#A8C0EC",
    backgroundColor: "#F7F9FC",
  },
  triggerDisabled: {
    backgroundColor: Skoun.color.surfaceMuted,
    borderColor: "#D5DBE4",
    cursor: "not-allowed",
  },
  locked: {
    minHeight: 56,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#C5D6F5",
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: Skoun.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockedIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBadge: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    letterSpacing: 0.2,
    color: Skoun.color.primary,
    textTransform: "uppercase",
  },
  triggerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  triggerValue: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.ink,
  },
  triggerPlaceholder: {
    fontFamily: Skoun.type.body,
    color: Skoun.color.inkFaint,
  },
  triggerDetail: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Skoun.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapOpen: {
    backgroundColor: Skoun.color.primaryMist,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 38, 0.42)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    padding: Platform.OS === "web" ? 24 : 0,
  },
  panel: {
    backgroundColor: Skoun.color.surface,
    overflow: "hidden",
    width: "100%",
  },
  panelWeb: {
    maxWidth: 440,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    shadowColor: "#121826",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 22px 48px rgba(18, 24, 38, 0.2)",
        } as object)
      : null),
  },
  panelNative: {
    borderTopLeftRadius: Skoun.radius.xl,
    borderTopRightRadius: Skoun.radius.xl,
    paddingBottom: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Skoun.color.border,
    marginTop: 10,
    marginBottom: 4,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 18 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF4",
  },
  panelTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    color: Skoun.color.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Skoun.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
    padding: 0,
    outlineStyle: "none" as unknown as undefined,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
  },
  empty: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkFaint,
    paddingHorizontal: 12,
    paddingVertical: 18,
    textAlign: "center",
  },
  option: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: Skoun.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  optionOn: {
    backgroundColor: Skoun.color.primaryMist,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.ink,
  },
  optionLabelOn: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.primary,
  },
  optionDetail: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
