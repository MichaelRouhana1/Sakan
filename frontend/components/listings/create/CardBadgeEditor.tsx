import { Ionicons } from "@expo/vector-icons";
import { Fragment, useState } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingAmberPillView } from "@/components/listings/ListingAmberPill";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { Lister } from "@/constants/listerTheme";
import {
  applyCardBadgeDrop,
  CARD_BADGE_FULL_MESSAGE,
  GRID_TAG_LIMIT,
  type CardBadgeDropTarget,
} from "@/lib/cardBadgeSelection";
import {
  isHighlightCardBadge,
  listingCardCandidates,
  listingCardPills,
  sameBadgeKeys,
} from "@/lib/listingCardBadges";
import type { Listing } from "@/types/listing";
import { useCardBadgeDrag } from "./useCardBadgeDrag";

type Props = {
  listing: Listing;
  onChange: (keys: string[]) => void;
};

export function CardBadgeEditor({ listing, onChange }: Props) {
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const keys = listing.cardBadges ?? [];
  const pills = listingCardPills(listing);
  const candidates = listingCardCandidates(listing);
  const sideBySide = contentWidth >= 760;
  const showList = Platform.OS === "web" && width >= 1024;
  const controlIndex = keys.indexOf(activeControl ?? "");
  const controlPill = pills[controlIndex];

  function drop(key: string, target: CardBadgeDropTarget) {
    if (!candidates.some((pill) => pill.key === key)) return;
    const next = applyCardBadgeDrop(keys, key, target);
    if (next.full) {
      setMessage(CARD_BADGE_FULL_MESSAGE);
      return;
    }
    if (sameBadgeKeys(next.keys, keys)) return;
    const label = candidates.find((pill) => pill.key === key)!.label;
    const removed = !next.keys.includes(key);
    setMessage(removed ? `${label} removed from the card.`
      : `${label} is badge ${next.keys.indexOf(key) + 1} of ${next.keys.length}.`);
    if (removed && activeControl === key) setActiveControl(null);
    onChange(next.keys);
  }

  const drag = useCardBadgeDrag({ pills: candidates, onDrop: drop });
  const cardTarget = drag.target?.zone === "card" ? drag.target : null;
  const fullDrop = !!cardTarget && keys.length >= GRID_TAG_LIMIT && !keys.includes(drag.activeKey ?? "");
  const status = fullDrop ? CARD_BADGE_FULL_MESSAGE : message;

  function keyboardProps(key: string): Record<string, unknown> {
    if (Platform.OS !== "web") return {};
    return {
      onKeyDown: (event: { key: string; altKey: boolean; preventDefault: () => void; stopPropagation: () => void }) => {
        const index = keys.indexOf(key);
        if (index < 0) return;
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          drop(key, { zone: "pool" });
        } else if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          drop(key, { zone: "card", index: event.key === "ArrowLeft" ? index - 1 : index + 2 });
        }
      },
    };
  }

  function insertion(index: number) {
    return cardTarget?.index === index && !fullDrop ? (
      <View pointerEvents="none" style={styles.insertion} />
    ) : null;
  }

  const cardBadges = (
    <View
      {...drag.zoneProps("card")}
      testID="card-badge-drop-zone"
      style={[styles.dropZone, !!cardTarget && styles.dropZoneActive, fullDrop && styles.dropZoneFull]}
    >
      <View style={styles.cardBadges}>
        {pills.map((pill, index) => (
          <Fragment key={pill.key}>
            <View
              {...drag.badgeProps(pill.key, "card")}
              style={[styles.cardBadge, drag.activeKey === pill.key && styles.dragging]}
            >
              {insertion(index)}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Arrange ${pill.label}, badge ${index + 1} of ${pills.length}`}
                accessibilityHint="Tap for reorder controls. With a keyboard, use Alt and the left or right arrow to reorder, or Delete to remove."
                accessibilityState={{ expanded: activeControl === pill.key }}
                onPress={() => setActiveControl(activeControl === pill.key ? null : pill.key)}
                {...keyboardProps(pill.key)}
                style={styles.badgeButton}
              >
                <ListingAmberPillView
                  pill={pill}
                  highlight={isHighlightCardBadge(pill.key)}
                  style={activeControl === pill.key ? styles.focusedPill : undefined}
                />
              </Pressable>
              <Pressable
                {...(Platform.OS === "web" ? { dataSet: { badgeControl: "true" } } : {})}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${pill.label}`}
                onPress={() => drop(pill.key, { zone: "pool" })}
                hitSlop={4}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={13} color={Lister.color.inkMuted} />
              </Pressable>
            </View>
          </Fragment>
        ))}
        <View style={styles.endMarker}>{insertion(pills.length)}</View>
        {pills.length === 0 ? (
          <LText variant="caption" tone="muted" style={styles.empty}>
            {Platform.OS === "web" ? "Drop badges here, or tap one to add it." : "Tap an available badge to add it."}
          </LText>
        ) : null}
      </View>
      {controlPill && !drag.activeKey ? (
        <View style={styles.reorderControls}>
          <LText variant="caption" tone="muted" style={styles.controlLabel}>{controlPill.label}</LText>
          <ReorderButton label={`Move ${controlPill.label} earlier`} icon="chevron-back" disabled={controlIndex === 0}
            onPress={() => drop(controlPill.key, { zone: "card", index: controlIndex - 1 })} />
          <ReorderButton label={`Move ${controlPill.label} later`} icon="chevron-forward" disabled={controlIndex === keys.length - 1}
            onPress={() => drop(controlPill.key, { zone: "card", index: controlIndex + 2 })} />
          <ReorderButton label="Close badge controls" icon="close" onPress={() => setActiveControl(null)} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.editor, sideBySide && styles.editorWide]}>
        <View style={[styles.gridFrame, sideBySide && styles.gridFrameWide]}>
          <ListingResultCard listing={listing} interactive={false} renderGridBadges={() => cardBadges} />
          <LText variant="caption" tone="muted" style={styles.cardCaption}>
            {keys.length} / {GRID_TAG_LIMIT} badges · {Platform.OS === "web" ? "Drag to reorder, or tap a badge for controls." : "Tap a badge to arrange it."}
          </LText>
        </View>

        <View
          {...drag.zoneProps("pool")}
          testID="available-badge-pool"
          style={[styles.pool, sideBySide && styles.poolWide, drag.target?.zone === "pool" && styles.poolActive]}
        >
          <LText variant="title" style={styles.poolTitle}>Available badges</LText>
          <LText tone="muted" style={styles.poolHint}>
            {Platform.OS === "web"
              ? "Drag up to 6 onto your card. Drag them back here to remove."
              : "Choose up to 6 badges. Tap a selected badge to remove it."}
          </LText>
          <Ionicons name="arrow-down" size={28} color={Lister.color.inkMuted} style={styles.poolArrow} />
          <View style={styles.poolBadges}>
            {candidates.map((pill) => {
              const selected = keys.includes(pill.key);
              return (
                <View key={pill.key} {...drag.badgeProps(pill.key, "pool")} style={styles.poolBadge}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${selected ? "Remove" : "Add"} ${pill.label} ${selected ? "from" : "to"} card`}
                    accessibilityState={{ selected }}
                    onPress={() => drop(pill.key, selected ? { zone: "pool" } : { zone: "card", index: keys.length })}
                    style={[styles.poolButton, selected && styles.poolButtonSelected]}
                  >
                    <ListingAmberPillView pill={pill} highlight={isHighlightCardBadge(pill.key)} style={styles.poolPill} />
                    {selected ? <Ionicons name="checkmark" size={13} color={Lister.color.primary} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          {candidates.length === 0 ? <LText tone="muted">Add details in the earlier steps to see available badges.</LText> : null}
          <LText
            accessibilityLiveRegion="polite"
            variant="caption"
            tone={status === CARD_BADGE_FULL_MESSAGE ? "danger" : "muted"}
            style={styles.feedback}
          >{status || "Selected badges are marked with a check."}</LText>
        </View>
      </View>

      {showList ? (
        <View style={styles.listPreview} testID="list-card-preview">
          <ListingResultCard listing={listing} variant="list" interactive={false} />
          <LText variant="caption" tone="muted" style={styles.listCaption}>List view · the same badges, in the same order.</LText>
        </View>
      ) : null}
      {drag.overlay}
    </View>
  );
}

function ReorderButton({ label, icon, disabled, onPress }: {
  label: string; icon: "chevron-back" | "chevron-forward" | "close"; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={[styles.reorderButton, disabled && styles.disabled]}>
      <Ionicons name={icon} size={17} color={Lister.color.ink} />
    </Pressable>
  );
}

// React Native's cursor type only includes native-supported values.
const webDragStyle = Platform.OS === "web"
  ? { touchAction: "none", cursor: "grab", userSelect: "none" } as unknown as ViewStyle
  : {};

const styles = StyleSheet.create({
  root: { gap: 36, width: "100%" },
  editor: { gap: 28 },
  editorWide: { flexDirection: "row", alignItems: "center", gap: 32 },
  gridFrame: { width: "100%", maxWidth: 440, alignSelf: "center" },
  gridFrameWide: { width: "44%", flexShrink: 0, alignSelf: "flex-start" },
  cardCaption: { marginTop: 12, lineHeight: 20 },
  dropZone: { minHeight: 56, borderWidth: 1, borderColor: "transparent", borderRadius: 10, padding: 3 },
  dropZoneActive: { borderColor: Lister.color.primary, borderStyle: "dashed", backgroundColor: Lister.color.primaryMist },
  dropZoneFull: { borderColor: Lister.color.danger, backgroundColor: Lister.color.dangerSoft },
  cardBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  cardBadge: { flexDirection: "row", alignItems: "center", position: "relative", maxWidth: "100%", minHeight: 32,
    ...webDragStyle },
  badgeButton: { flexShrink: 1, ...webDragStyle },
  focusedPill: { borderColor: Lister.color.primary },
  removeButton: { width: 26, minHeight: 32, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  dragging: { opacity: 0.4 },
  insertion: { position: "absolute", left: -5, top: 2, bottom: 2, width: 3, minHeight: 25, borderRadius: 2, backgroundColor: Lister.color.primary },
  endMarker: { position: "relative", width: 0, height: 28 },
  empty: { paddingVertical: 8, lineHeight: 20 },
  reorderControls: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: Lister.color.border, paddingTop: 8 },
  controlLabel: { flex: 1 },
  reorderButton: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Lister.color.surfaceMuted, cursor: "pointer" },
  disabled: { opacity: 0.35 },
  pool: { gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "transparent", padding: 12 },
  poolWide: { flex: 1, minWidth: 0, paddingVertical: 28 },
  poolActive: { borderStyle: "dashed", borderColor: Lister.color.primary, backgroundColor: Lister.color.primaryMist },
  poolTitle: { textAlign: "center", fontSize: 28, lineHeight: 36 },
  poolHint: { textAlign: "center", maxWidth: 360, alignSelf: "center", lineHeight: 22 },
  poolArrow: { alignSelf: "center", marginVertical: 4 },
  poolBadges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  poolBadge: { maxWidth: "100%", ...webDragStyle },
  poolButton: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, borderWidth: 1, borderColor: Lister.color.border, backgroundColor: "#F8FAFC", paddingRight: 6, minHeight: 32, ...webDragStyle },
  poolButtonSelected: { borderColor: Lister.color.primarySoft, backgroundColor: Lister.color.primaryMist },
  poolPill: { borderWidth: 0, backgroundColor: "transparent", flexShrink: 1 },
  feedback: { minHeight: 40, lineHeight: 20, textAlign: "center", marginTop: 4 },
  listPreview: { gap: 10 },
  listCaption: { textAlign: "right" },
});
