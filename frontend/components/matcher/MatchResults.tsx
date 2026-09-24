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
import { PRICE_BASIS_LABELS } from "@/lib/listingLabels";
import { answerLabel } from "@/features/matcher/questions";
import {
  DIMENSIONS,
  type MatcherPreferences,
  type MatchPresentation,
} from "@/features/matcher/types";
import type { explainWidening } from "@/features/matcher/scoring";

export function MatchSummaryBar({
  prefs,
  count,
  widening,
  onEdit,
  onStop,
  onClear,
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
  const title = useRef<Text>(null);
  useEffect(() => {
    if (!focusRevision) return;
    const timer = setTimeout(() => {
      if (Platform.OS === "web")
        (title.current as unknown as HTMLElement)?.focus?.();
      else {
        const node = findNodeHandle(title.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [focusRevision]);
  const hasMust = DIMENSIONS.some((d) => prefs[d]?.importance === "required");
  return (
    <View style={s.summary}>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            ref={title}
            {...(Platform.OS === "web" ? { tabIndex: -1 } : {})}
            accessibilityRole="header"
            style={s.heading}
          >
            {matching ? "Closest to what you want" : "Your preferences"}
          </Text>
          <Text style={s.muted}>Your choices, applied to real listings.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onEdit} style={s.action}>
          <Ionicons
            accessible={false}
            aria-hidden={true}
            name="options-outline"
            size={16}
            color={Skoun.color.primary}
          />
          <Text style={s.link}>Ask again</Text>
        </Pressable>
      </View>
      <View style={s.wrap}>
        {DIMENSIONS.filter((d) => prefs[d]).map((d) => (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${answerLabel(prefs, d)}`}
            onPress={onEdit}
            style={s.pref}
          >
            <Text style={s.prefText}>
              {answerLabel(prefs, d)}
              {prefs[d]?.importance === "required" ? " · Must have" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      {matching && !loading ? (
        <View accessibilityLiveRegion="polite" style={s.notes}>
          {count < 3 ? (
            <Text style={s.muted}>
              {count === 0
                ? "No live listings meet these requirements."
                : `Only ${count} ${count === 1 ? "listing meets" : "listings meet"} ${hasMust ? "your must-haves" : "this search"}.`}{" "}
              Edit your requirements or clear filters to explore more.
            </Text>
          ) : (
            <Text style={s.muted}>
              {widening.strictCount}{" "}
              {widening.strictCount === 1 ? "listing fits" : "listings fit"}{" "}
              every preference. All {count} eligible listings stay visible.
            </Text>
          )}
          {widening.labels.map((label) => (
            <Text key={label} style={s.note}>
              ↳ {label}.
            </Text>
          ))}
          {count >= 3 && widening.shortfall ? (
            <Text style={s.muted}>
              Fewer than three fit even these broader preferences. The closest
              available options are shown below.
            </Text>
          ) : null}
          {widening.labels.length ? (
            <Text style={s.muted}>
              Your must-haves and original scores are unchanged.
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={s.wrap}>
        {!matching ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMatch}
            style={s.action}
          >
            <Text style={s.link}>Best matches</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onEdit} style={s.action}>
          <Text style={s.link}>Edit requirements</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onStop} style={s.action}>
          <Text style={s.muted}>Stop matching</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          style={s.action}
        >
          <Text style={s.muted}>Clear all filters</Text>
        </Pressable>
      </View>
    </View>
  );
}
export function MatchCardChrome({ match }: { match: MatchPresentation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[s.card, match.top && s.top]}>
      {match.top ? (
        <View style={s.row}>
          <Ionicons
            accessible={false}
            aria-hidden={true}
            name="checkmark-circle-outline"
            size={17}
            color={Skoun.color.primary}
          />
          <Text style={s.topLabel}>Closest to your prefs</Text>
        </View>
      ) : null}
      {match.reasons.length ? (
        <Text style={s.reason}>{match.reasons.join(" · ")}</Text>
      ) : (
        <Text style={s.muted}>Some preferences could not be confirmed.</Text>
      )}
      <Text style={s.basis}>
        {match.priceBasis
          ? PRICE_BASIS_LABELS[match.priceBasis]
          : "Pricing basis not specified"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((v) => !v)}
        style={s.explain}
      >
        <Text style={s.link}>
          {expanded ? "Hide explanation" : "Why this one"}
        </Text>
        <Ionicons
          accessible={false}
          aria-hidden={true}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={Skoun.color.primary}
        />
      </Pressable>
      {expanded ? (
        <View style={s.details}>
          <Text style={s.score}>
            {Math.round(match.score)}/100 preference score
          </Text>
          <Text style={s.muted}>
            {match.knownCount} of {match.answeredCount} answered dimensions have
            reported information. This is a preference score, not a guarantee.
          </Text>
          {match.details.map((d) => (
            <View key={d.dimension} style={s.detailRow}>
              <Text style={s.detailLabel}>
                {d.label} · weight {d.weight}
                {d.required ? " · Must have" : ""}
              </Text>
              <Text style={s.muted}>
                {d.description} · {Math.round(d.credit * 100)}% credit
              </Text>
            </View>
          ))}
          <Text style={s.muted}>
            Weighted credit divided by the weights of your answered questions.
            Missing information earns no credit.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  summary: {
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Skoun.color.bgWash,
    borderRadius: 24,
    backgroundColor: Skoun.color.surface,
    gap: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heading: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 21,
    lineHeight: 28,
    color: Skoun.color.ink,
  },
  muted: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 19,
    color: Skoun.color.inkMuted,
  },
  link: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.primary,
  },
  action: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  pref: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: Skoun.color.primaryMist,
    maxWidth: "100%",
  },
  prefText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  notes: { gap: 6 },
  note: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 19,
    color: Skoun.color.ink,
  },
  card: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Skoun.color.bgWash,
    gap: 7,
    backgroundColor: Skoun.color.surface,
  },
  top: {
    backgroundColor: "#F5F8FD",
    borderTopWidth: 3,
    borderTopColor: Skoun.color.primary,
  },
  topLabel: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 12,
    color: Skoun.color.primary,
  },
  reason: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 19,
    color: Skoun.color.ink,
  },
  basis: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkMuted,
  },
  explain: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  details: { gap: 12, paddingTop: 8 },
  score: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    color: Skoun.color.ink,
  },
  detailRow: { gap: 3 },
  detailLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.ink,
  },
});
