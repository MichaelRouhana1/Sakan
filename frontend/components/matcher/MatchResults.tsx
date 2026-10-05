import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Skoun } from "@/constants/theme";
import { answerLabel } from "@/features/matcher/questions";
import {
  DIMENSIONS,
  type MatcherPreferences,
} from "@/features/matcher/types";
import type { explainWidening } from "@/features/matcher/scoring";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { PrefsPopover } from "@/components/matcher/PrefsPopover";

export function MatchSummaryBar({
  prefs,
  count,
  widening,
  onEdit,
  onMatch,
  matching,
  loading,
  focusRevision = 0,
}: {
  prefs: MatcherPreferences;
  count: number;
  widening: ReturnType<typeof explainWidening>;
  onEdit: () => void;
  onStop: () => void;
  onClear: () => void;
  onMatch: () => void;
  matching: boolean;
  loading: boolean;
  focusRevision?: number;
}) {
  const row = useRef<View>(null);
  const anchor = useRef<View>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coarse = useCoarsePointer();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showDetails = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setDetailsOpen(true);
  };
  const hideDetails = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setDetailsOpen(false), 140);
  };
  useEffect(() => {
    if (!focusRevision) return;
    const timer = setTimeout(() => {
      if (Platform.OS === "web")
        (row.current as unknown as HTMLElement)?.focus?.();
      else {
        const node = findNodeHandle(row.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [focusRevision]);
  const chosen = DIMENSIONS.filter((d) => prefs[d]);
  const hasMust = chosen.some((d) => prefs[d]?.importance === "required");
  const fitNote =
    matching && !loading
      ? count < 3
        ? `${
            count === 0
              ? "No live listings meet these requirements."
              : `Only ${count} ${count === 1 ? "listing meets" : "listings meet"} ${hasMust ? "your must-haves" : "this search"}.`
          } Edit your requirements or clear filters to explore more.`
        : `${widening.strictCount} ${
            widening.strictCount === 1 ? "listing fits" : "listings fit"
          } every preference. All ${count} eligible listings stay visible.`
      : null;
  return (
    <View
      ref={row}
      {...(Platform.OS === "web" ? { tabIndex: -1 } : {})}
      style={s.bar}
    >
      {chosen.length ? (
        <View
          ref={anchor}
          style={s.detailsAnchor}
          {...(Platform.OS === "web"
            ? {
                onMouseEnter: showDetails,
                onMouseLeave: hideDetails,
              }
            : {})}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your preferences"
            accessibilityState={{ expanded: detailsOpen }}
            onFocus={() => {
              if (!coarse) showDetails();
            }}
            onBlur={() => {
              if (!coarse) hideDetails();
            }}
            onPress={() => {
              if (coarse) setDetailsOpen((open) => !open);
            }}
            hitSlop={6}
            style={s.prefsBtn}
          >
            <Ionicons
              accessible={false}
              aria-hidden
              name={detailsOpen ? "information-circle" : "information-circle-outline"}
              size={18}
              color={Skoun.color.primary}
            />
            <Text style={s.linkLg}>Preferences</Text>
          </Pressable>
          <PrefsPopover
            open={detailsOpen}
            anchorRef={anchor}
            onEnter={showDetails}
            onLeave={hideDetails}
          >
            {chosen.map((d) => (
              <Text key={d} style={s.note}>
                {answerLabel(prefs, d)}
                {prefs[d]?.importance === "required" ? " · Must have" : ""}
              </Text>
            ))}
            {fitNote && count >= 3 ? (
              <Text style={s.muted}>{fitNote}</Text>
            ) : null}
          </PrefsPopover>
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onEdit} style={s.actionLg}>
        <Ionicons
          accessible={false}
          aria-hidden={true}
          name="pencil-outline"
          size={18}
          color={Skoun.color.primary}
        />
        <Text style={s.linkLg}>Edit</Text>
      </Pressable>
      {!matching ? (
        <Pressable accessibilityRole="button" onPress={onMatch} style={s.action}>
          <Text style={s.link}>Best matches</Text>
        </Pressable>
      ) : null}
      {fitNote && count < 3 ? (
        <Text accessibilityLiveRegion="polite" style={[s.muted, s.warning]}>
          {fitNote}
        </Text>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  muted: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  link: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 16,
    color: Skoun.color.primary,
  },
  action: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
    cursor: "pointer",
  },
  prefsBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  actionLg: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  linkLg: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.primary,
  },
  warning: {
    flexBasis: "100%",
  },
  detailsAnchor: {
    position: "relative",
  },
  note: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.ink,
  },
});
