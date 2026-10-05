import { useEffect, useId, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Skoun } from "@/constants/theme";
import { PRICE_BASIS_LABELS } from "@/lib/listingLabels";
import type { MatchPresentation } from "@/features/matcher/types";
import { useCoarsePointer } from "@/lib/useCoarsePointer";

export function BestMatchBadge({
  match,
  room = 0,
  onOpenChange,
}: {
  match: MatchPresentation;
  /** Card width, so the explanation stays clear of the save button. */
  room?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(false);
  const coarse = useCoarsePointer();
  const tipId = useId().replace(/:/g, "");
  const panelWidth = room > 0 ? Math.min(280, Math.max(168, room - 78)) : 260;

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !coarse || Platform.OS !== "web") return;
    const close = (event: PointerEvent) => {
      const root = document.getElementById(`best-match-${tipId}`);
      if (root?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, coarse, tipId]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <View
      nativeID={`best-match-${tipId}`}
      style={[styles.anchor, { maxWidth: panelWidth }]}
      {...(Platform.OS === "web"
        ? {
            onMouseEnter: () => {
              if (coarse) return;
              setHot(true);
              show();
            },
            onMouseLeave: () => {
              setHot(false);
              if (!coarse) hide();
            },
          }
        : {})}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Best match"
        accessibilityHint="Shows why this place matches your preferences"
        accessibilityState={{ expanded: open }}
        testID="best-match-badge"
        hitSlop={6}
        onFocus={show}
        onBlur={() => {
          if (!coarse) hide();
        }}
        onPress={(event) => {
          event?.stopPropagation?.();
          if (coarse) setOpen((value) => !value);
        }}
        style={({ hovered, focused }) => [
          styles.badge,
          (hovered || hot || open) && styles.badgeHot,
          focused && styles.badgeFocus,
        ]}
        {...(Platform.OS === "web"
          ? ({
              "aria-expanded": open,
              "aria-controls": open ? tipId : undefined,
            } as object)
          : {})}
      >
        <Text style={styles.label}>Best match</Text>
        <Ionicons
          accessible={false}
          aria-hidden
          name={hot || open ? "information-circle" : "information-circle-outline"}
          size={15}
          color={Skoun.color.primary}
        />
      </Pressable>
      {open ? (
        <View
          nativeID={tipId}
          accessibilityRole="summary"
          accessibilityLabel="Why this one"
          style={[
            styles.panel,
            { width: panelWidth },
            Platform.OS !== "web" ? { overflow: "scroll" as const } : null,
          ]}
          {...(Platform.OS === "web"
            ? { dataSet: { bestMatchTip: "1" } }
            : {})}
          {...(Platform.OS === "web"
            ? ({ role: "tooltip" } as object)
            : {})}
        >
          <Text style={styles.kicker}>Why this one</Text>
          {match.reasons.length ? (
            <Text style={styles.reason}>{match.reasons.join(" · ")}</Text>
          ) : (
            <Text style={styles.muted}>
              Some preferences could not be confirmed.
            </Text>
          )}
          <Text style={styles.basis}>
            {match.priceBasis
              ? PRICE_BASIS_LABELS[match.priceBasis]
              : "Pricing basis not specified"}
          </Text>
          <View style={styles.rule} />
          <Text style={styles.score}>
            {Math.round(match.score)}/100 preference score
          </Text>
          <Text style={styles.muted}>
            {match.knownCount} of {match.answeredCount} answered dimensions have
            reported information. This is a preference score, not a guarantee.
          </Text>
          {match.details.map((detail) => (
            <View key={detail.dimension} style={styles.detail}>
              <Text style={styles.detailLabel}>
                {detail.label} · weight {detail.weight}
                {detail.required ? " · Must have" : ""}
              </Text>
              <Text style={styles.muted}>
                {detail.description} · {Math.round(detail.credit * 100)}% credit
              </Text>
            </View>
          ))}
          <Text style={styles.footnote}>
            Weighted credit divided by the weights of your answered questions.
            Missing information earns no credit.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 8,
    alignItems: "flex-start",
  },
  badge: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(18, 24, 38, 0.16)",
    transitionProperty: "background-color, border-color, box-shadow",
    transitionDuration: "180ms",
    transitionTimingFunction: "ease",
  },
  badgeHot: {
    backgroundColor: "#FFFFFF",
    borderColor: Skoun.color.primary,
    boxShadow: "0 4px 12px rgba(47, 111, 237, 0.22)",
  },
  badgeFocus: {
    borderColor: Skoun.color.primary,
    boxShadow: "0 0 0 2px #FFFFFF, 0 0 0 4px #2F6FED",
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.ink,
  },
  panel: {
    marginTop: 8,
    maxHeight: 320,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    boxShadow: "0 16px 36px rgba(18, 24, 38, 0.16)",
  },
  kicker: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.primary,
  },
  reason: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  basis: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  rule: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: "#E2E8F0",
    marginTop: 2,
  },
  score: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: Skoun.color.ink,
  },
  muted: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  detail: {
    gap: 2,
  },
  detailLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.ink,
  },
  footnote: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
    paddingTop: 2,
  },
});
