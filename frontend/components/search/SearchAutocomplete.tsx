import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type TextInputProps,
  type View as RNView,
} from "react-native";
import { Skoun } from "@/constants/theme";
import { useSearchSuggestions } from "@/features/search/useSearchSuggestions";
import type {
  SearchAreaSuggestion,
  SearchListingSuggestion,
  SearchSuggestion,
  SearchUniversitySuggestion,
} from "@/features/search/types";

const PILL_HINTS = ["Area", "University", "Landmark"] as const;
const IS_WEB = Platform.OS === "web";

type PortalFn = (
  children: React.ReactNode,
  container: Element | DocumentFragment,
) => React.ReactPortal;

const createPortal: PortalFn | null = IS_WEB
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("react-dom").createPortal as PortalFn)
  : null;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestionsEnabled?: boolean;
  onSelectArea: (s: SearchAreaSuggestion) => void;
  onSelectUniversity: (s: SearchUniversitySuggestion) => void;
  onSelectListing: (s: SearchListingSuggestion) => void;
  onSubmitText: (q: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
  style?: TextInputProps["style"];
  containerStyle?: object;
  variant?: "pill" | "bar";
};

type FlatRow =
  | {
      kind: "header";
      key: string;
      title: string;
      icon: keyof typeof Ionicons.glyphMap;
    }
  | { kind: "item"; key: string; suggestion: SearchSuggestion; flatIndex: number };

type AnchorRect = { top: number; left: number; width: number };

function flattenSuggestions(data: {
  areas: SearchAreaSuggestion[];
  universities: SearchUniversitySuggestion[];
  listings: SearchListingSuggestion[];
} | undefined): FlatRow[] {
  if (!data) return [];
  const rows: FlatRow[] = [];
  let flatIndex = 0;
  const pushGroup = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    key: string,
    items: SearchSuggestion[],
    itemKey: (s: SearchSuggestion) => string,
  ) => {
    if (items.length === 0) return;
    rows.push({ kind: "header", key: `h-${key}`, title, icon });
    for (const s of items) {
      rows.push({
        kind: "item",
        key: itemKey(s),
        suggestion: s,
        flatIndex: flatIndex++,
      });
    }
  };
  pushGroup("Areas & Cities", "location-outline", "areas", data.areas, (s) =>
    s.type === "area" ? `a-${s.label}` : "a",
  );
  pushGroup(
    "Universities & Campuses",
    "school-outline",
    "uni",
    data.universities,
    (s) => (s.type === "university" ? `u-${s.campusId}` : "u"),
  );
  pushGroup("Listings", "home-outline", "list", data.listings, (s) =>
    s.type === "listing" ? `l-${s.id}` : "l",
  );
  return rows;
}

function suggestionLabel(s: SearchSuggestion): string {
  return s.label;
}

function suggestionIcon(
  type: SearchSuggestion["type"],
): keyof typeof Ionicons.glyphMap {
  if (type === "area") return "location-outline";
  if (type === "university") return "school-outline";
  return "home-outline";
}

function SuggestionsPanel({
  rows,
  highlight,
  setHighlight,
  isFetching,
  value,
  onApply,
  onSubmitPlain,
}: {
  rows: FlatRow[];
  highlight: number;
  setHighlight: (n: number) => void;
  isFetching: boolean;
  value: string;
  onApply: (s: SearchSuggestion) => void;
  onSubmitPlain: () => void;
}) {
  if (isFetching && rows.length === 0) {
    return <Text style={styles.empty}>Searching…</Text>;
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      style={styles.dropdownScroll}
      contentContainerStyle={styles.dropdownContent}
    >
      {rows.map((item, idx) => {
        if (item.kind === "header") {
          const isFirst = idx === 0;
          return (
            <View
              key={item.key}
              style={[styles.sectionHead, !isFirst && styles.sectionHeadDivider]}
            >
              <Ionicons
                name={item.icon}
                size={13}
                color={Skoun.color.inkMuted}
              />
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
          );
        }
        const active = item.flatIndex === highlight;
        return (
          <Pressable
            key={item.key}
            onPress={() => onApply(item.suggestion)}
            onHoverIn={IS_WEB ? () => setHighlight(item.flatIndex) : undefined}
            style={[styles.row, active && styles.rowActive]}
            accessibilityRole="button"
            accessibilityLabel={suggestionLabel(item.suggestion)}
          >
            <View
              style={[styles.rowIconWrap, active && styles.rowIconWrapActive]}
            >
              <Ionicons
                name={suggestionIcon(item.suggestion.type)}
                size={16}
                color={active ? Skoun.color.primary : Skoun.color.inkMuted}
              />
            </View>
            <Text
              style={[styles.rowLabel, active && styles.rowLabelActive]}
              numberOfLines={1}
            >
              {suggestionLabel(item.suggestion)}
            </Text>
            {item.suggestion.type === "listing" ? (
              <Text style={styles.rowMeta} numberOfLines={1}>
                Listing
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      {value.trim().length >= 2 ? (
        <Pressable
          onPress={onSubmitPlain}
          style={styles.footerAction}
          accessibilityRole="button"
          accessibilityLabel={`Search all for ${value.trim()}`}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={Skoun.color.primary}
          />
          <Text style={styles.footerActionText} numberOfLines={1}>
            Search all for “{value.trim()}”
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export function SearchAutocomplete({
  value,
  onChangeText,
  placeholder = "Search area, university, listing…",
  suggestionsEnabled = true,
  onSelectArea,
  onSelectUniversity,
  onSelectListing,
  onSubmitText,
  onClear,
  autoFocus,
  style,
  containerStyle,
  variant = "bar",
}: Props) {
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [hintIndex, setHintIndex] = useState(0);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const inputRef = useRef<TextInput>(null);
  const wrapRef = useRef<RNView | null>(null);
  const barRef = useRef<RNView | null>(null);
  const reactId = useId().replace(/:/g, "");
  const anchorDomId = `skoun-search-anchor-${reactId}`;
  const { data, isFetching } = useSearchSuggestions(
    value,
    suggestionsEnabled && focused && value.trim().length >= 1,
  );

  const rows = useMemo(() => flattenSuggestions(data), [data]);
  const items = useMemo(
    () =>
      rows.filter(
        (r): r is Extract<FlatRow, { kind: "item" }> => r.kind === "item",
      ),
    [rows],
  );
  const showDropdown =
    focused && value.trim().length >= 1 && (rows.length > 0 || isFetching);
  const isPill = variant === "pill";
  const showPillHint = isPill && !value && !focused;

  useEffect(() => {
    if (!IS_WEB) return;
    setPortalRoot(document.body);
  }, []);

  const measureAnchor = useCallback(() => {
    if (!IS_WEB) return;

    const apply = (x: number, y: number, width: number, height: number) => {
      if (!(width > 8) || !(height > 8)) return;
      setAnchor({
        top: Math.round(y + height + 8),
        left: Math.round(x),
        width: Math.round(width),
      });
    };

    // Prefer DOM id — RN-web measureInWindow can report 0,0 before layout.
    const byId = document.getElementById(anchorDomId);
    if (byId) {
      const rect = byId.getBoundingClientRect();
      apply(rect.left, rect.top, rect.width, rect.height);
      return;
    }

    const bar = barRef.current;
    if (bar && typeof bar.measureInWindow === "function") {
      bar.measureInWindow(apply);
    }
  }, [anchorDomId]);

  useEffect(() => {
    if (!showDropdown || !IS_WEB) return;
    measureAnchor();
    const t0 = window.setTimeout(measureAnchor, 0);
    const t1 = window.setTimeout(measureAnchor, 50);
    const onReposition = () => measureAnchor();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [showDropdown, measureAnchor, value, rows.length]);

  useEffect(() => {
    if (!showPillHint) return;
    const id = setInterval(() => {
      setHintIndex((i) => (i + 1) % PILL_HINTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [showPillHint]);

  useEffect(() => {
    setHighlight(-1);
  }, [value, data]);

  function applySuggestion(s: SearchSuggestion) {
    setFocused(false);
    inputRef.current?.blur();
    if (s.type === "area") onSelectArea(s);
    else if (s.type === "university") onSelectUniversity(s);
    else onSelectListing(s);
  }

  function submitPlainText() {
    const trimmed = value.trim();
    setFocused(false);
    inputRef.current?.blur();
    onSubmitText(trimmed);
  }

  function handleSubmitFromKeyboard() {
    const trimmed = value.trim();
    if (!trimmed) {
      submitPlainText();
      return;
    }
    if (highlight >= 0 && highlight < items.length) {
      applySuggestion(items[highlight]!.suggestion);
      return;
    }
    submitPlainText();
  }

  function handleKeyDown(e: {
    key?: string;
    preventDefault?: () => void;
  }) {
    if (e.key === "Escape") {
      e.preventDefault?.();
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault?.();
      setHighlight((h) => Math.min(h < 0 ? 0 : h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault?.();
      setHighlight((h) => Math.max(h - 1, -1));
    }
  }

  function onWrapLayout(_e: LayoutChangeEvent) {
    if (showDropdown) measureAnchor();
  }

  const panel = showDropdown ? (
    <SuggestionsPanel
      rows={rows}
      highlight={highlight}
      setHighlight={setHighlight}
      isFetching={isFetching}
      value={value}
      onApply={applySuggestion}
      onSubmitPlain={submitPlainText}
    />
  ) : null;

  let dropdownNode = null;
  if (showDropdown) {
    if (IS_WEB && createPortal && portalRoot && anchor) {
      // Fixed portal: overlays page, does not grow hero / push "Top areas".
      dropdownNode = createPortal(
        <div
          style={{
            position: "fixed",
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            zIndex: 100000,
            maxHeight: 340,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 28px rgba(18, 24, 38, 0.2)",
            overflow: "hidden",
          }}
          role="list"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {panel}
        </div>,
        portalRoot,
      );
    } else if (!IS_WEB) {
      dropdownNode = (
        <View
          style={[styles.dropdown, styles.dropdownNative]}
          accessibilityRole="list"
        >
          {panel}
        </View>
      );
    }
  }

  return (
    <View
      ref={wrapRef}
      onLayout={onWrapLayout}
      style={[styles.wrap, isPill && styles.wrapPill, containerStyle]}
      {...(IS_WEB ? ({ onKeyDown: handleKeyDown } as object) : {})}
    >
      <View
        ref={barRef}
        nativeID={anchorDomId}
        {...(IS_WEB ? ({ id: anchorDomId } as object) : {})}
        style={[styles.bar, isPill ? styles.barPill : styles.barDefault]}
        collapsable={false}
      >
        {!isPill ? (
          <Ionicons
            name="search"
            size={18}
            color={Skoun.color.inkMuted}
            style={styles.leadingIcon}
          />
        ) : null}

        <View style={styles.inputHost}>
          {showPillHint ? (
            <View style={styles.hintRow} pointerEvents="none">
              <Text style={styles.hintStatic}>Search by </Text>
              <Text key={PILL_HINTS[hintIndex]} style={styles.hintCycle}>
                {PILL_HINTS[hintIndex]}
              </Text>
            </View>
          ) : null}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={isPill ? undefined : placeholder}
            placeholderTextColor={Skoun.color.inkFaint}
            style={[styles.input, isPill && styles.inputPill, style]}
            onFocus={() => {
              setFocused(true);
              requestAnimationFrame(() => measureAnchor());
            }}
            onBlur={() => {
              setTimeout(() => setFocused(false), 200);
            }}
            onSubmitEditing={handleSubmitFromKeyboard}
            returnKeyType="search"
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search"
          />
        </View>

        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText("");
              onClear();
              inputRef.current?.focus();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clearBtn}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={Skoun.color.inkMuted}
            />
          </Pressable>
        ) : null}

        {isPill ? (
          <Pressable
            onPress={submitPlainText}
            style={styles.searchCircle}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {dropdownNode}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 50,
    overflow: "visible",
    flex: 1,
  },
  wrapPill: {
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    zIndex: 2,
  },
  barDefault: {
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Skoun.color.border,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  barPill: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 90,
    paddingLeft: 22,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 56,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  leadingIcon: {
    marginRight: 8,
  },
  inputHost: {
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    position: "relative",
  },
  hintRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  hintStatic: {
    fontFamily: Skoun.type.body,
    fontSize: 17,
    color: "#4b5563",
  },
  hintCycle: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 17,
    color: "#4b5563",
  },
  input: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 16,
    color: Skoun.color.ink,
    paddingVertical: 10,
    ...Platform.select({
      web: { outlineStyle: "none" } as object,
      default: {},
    }),
  },
  inputPill: {
    fontSize: 17,
    paddingVertical: 10,
    minHeight: 40,
  },
  clearBtn: {
    marginLeft: 4,
    padding: 4,
  },
  searchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 340,
    overflow: "hidden",
    shadowColor: "#121826",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  dropdownNative: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 8,
    zIndex: 60,
  },
  dropdownPortal: {
    position: "fixed" as unknown as "absolute",
    zIndex: 9999,
    marginTop: 0,
  },
  dropdownScroll: {
    maxHeight: 340,
  },
  dropdownContent: {
    paddingBottom: 6,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeadDivider: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    fontWeight: "600",
    color: Skoun.color.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEF1F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconWrapActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  rowLabel: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  rowLabelActive: {
    fontFamily: Skoun.type.bodyMedium,
  },
  rowMeta: {
    fontSize: 12,
    color: Skoun.color.inkFaint,
  },
  footerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginHorizontal: 6,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  footerActionText: {
    flex: 1,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.primary,
  },
  empty: {
    padding: 16,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
});
