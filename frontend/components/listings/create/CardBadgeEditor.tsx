import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingAmberPillView } from "@/components/listings/ListingAmberPill";
import { ListingResultCard, badgeBandMaxHeight } from "@/components/web/ListingResultCard";
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
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { WizardHeadline } from "./WizardHeadline";
import { WIZARD_STEPS } from "@/constants/listingWizard";

const reviewStep = WIZARD_STEPS.find((step) => step.id === "review")!;

type Props = {
  listing: Listing;
  onChange: (keys: string[]) => void;
};

function CardBadgeSubsetEditor({ listing, onChange }: Props) {
  const { formChrome } = useCreateListingDraft();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const keys = listing.cardBadges ?? [];
  const pills = listingCardPills(listing);
  const candidates = listingCardCandidates(listing);
  const sideBySide = contentWidth >= 820;
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
          <View
            key={pill.key}
            {...drag.badgeProps(pill.key, "card")}
            style={[styles.cardBadge, drag.activeKey === pill.key && styles.dragging]}
          >
            {insertion(index)}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Arrange ${pill.label}, badge ${index + 1} of ${pills.length}`}
              accessibilityHint="Tap for reorder and remove controls. With a keyboard, use Alt and the left or right arrow to reorder, or Delete to remove."
              accessibilityState={{ expanded: activeControl === pill.key }}
              onPress={() => setActiveControl(activeControl === pill.key ? null : pill.key)}
              {...keyboardProps(pill.key)}
              style={styles.badgeButton}
            >
              <ListingAmberPillView
                pill={pill}
                compact
                highlight={isHighlightCardBadge(pill.key)}
                style={activeControl === pill.key ? styles.focusedPill : undefined}
              />
            </Pressable>
          </View>
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
          <ReorderButton label={`Remove ${controlPill.label}`} icon="trash-outline"
            onPress={() => drop(controlPill.key, { zone: "pool" })} />
          <ReorderButton label="Close badge controls" icon="close" onPress={() => setActiveControl(null)} />
        </View>
      ) : null}
    </View>
  );

  const badgePool = (
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
  );

  const titleSize = Math.min(60, Math.max(42, contentWidth * 0.046));
  const heading = (
    <View testID="card-customization-heading">
      <WizardHeadline title={reviewStep.title} subtitle={reviewStep.subtitle}
        titleStyle={sideBySide ? { fontSize: titleSize, lineHeight: titleSize * 1.16 } : undefined} />
    </View>
  );

  return (
    <View style={styles.root} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
      {formChrome === "edit" ? null : !sideBySide ? heading : null}
      <View style={[styles.editor, sideBySide && styles.editorWide]}>
        {sideBySide ? <View style={styles.centerColumn}>{formChrome === "edit" ? null : heading}{badgePool}</View> : null}
        <View testID="grid-card-preview" style={[styles.gridFrame, sideBySide && styles.gridFrameWide]}>
          <ListingResultCard listing={listing} interactive={false} renderGridBadges={() => cardBadges} />
          <LText variant="caption" tone="muted" style={styles.cardCaption}>
            {keys.length} / {GRID_TAG_LIMIT} badges · {Platform.OS === "web" ? "Drag to reorder, or tap a badge for controls." : "Tap a badge to arrange it."}
          </LText>
        </View>
        {!sideBySide ? badgePool : null}
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
  label: string; icon: "chevron-back" | "chevron-forward" | "trash-outline" | "close"; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      {...(Platform.OS === "web" ? { dataSet: { badgeControl: "true" } } : {})}
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
  editorWide: { flexDirection: "row", alignItems: "flex-start", gap: 48, minHeight: 700 },
  centerColumn: { flex: 1, minWidth: 0, gap: 0 },
  gridFrame: { width: "100%", maxWidth: 440, alignSelf: "center" },
  gridFrameWide: { width: "42%", maxWidth: 430, flexShrink: 0, alignSelf: "flex-start", marginTop: 44 },
  cardCaption: { marginTop: 12, lineHeight: 20 },
  dropZone: { minHeight: 49, borderWidth: 1, borderColor: "transparent", borderRadius: 10 },
  dropZoneActive: { borderColor: Lister.color.primary, borderStyle: "dashed", backgroundColor: Lister.color.primaryMist },
  dropZoneFull: { borderColor: Lister.color.danger, backgroundColor: Lister.color.dangerSoft },
  cardBadges: { flexDirection: "row", flexWrap: "wrap", gap: 5, alignItems: "center" },
  cardBadge: { flexDirection: "row", alignItems: "center", position: "relative", maxWidth: "100%", minHeight: 24,
    ...webDragStyle },
  badgeButton: { flexShrink: 1, ...webDragStyle },
  focusedPill: { borderColor: Lister.color.primary },
  dragging: { opacity: 0.4 },
  insertion: { position: "absolute", left: -5, top: 2, bottom: 2, width: 3, minHeight: 25, borderRadius: 2, backgroundColor: Lister.color.primary },
  endMarker: { position: "relative", width: 0, height: 28 },
  empty: { paddingVertical: 8, lineHeight: 20 },
  reorderControls: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: Lister.color.border, paddingTop: 8 },
  controlLabel: { flex: 1 },
  reorderButton: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Lister.color.surfaceMuted, cursor: "pointer" },
  disabled: { opacity: 0.35 },
  pool: { gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "transparent", padding: 12 },
  poolWide: { minWidth: 0, paddingTop: 4, paddingBottom: 8, gap: 14 },
  poolActive: { borderStyle: "dashed", borderColor: Lister.color.primary, backgroundColor: Lister.color.primaryMist },
  poolTitle: { textAlign: "center", fontSize: 32, lineHeight: 40 },
  poolHint: { textAlign: "center", maxWidth: 440, alignSelf: "center", fontSize: 17, lineHeight: 26 },
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

const wizardGripStyle = Platform.OS === "web"
  ? { touchAction: "none", cursor: "grab", userSelect: "none" } as unknown as ViewStyle
  : {};

const LIST_BADGE_ROWS = 3;
const LIST_CARD_MIN = 720;
const LIST_CARD_FIT = 560;

const wizardStyles = StyleSheet.create({
  stage: { gap: 28, width: "100%" },
  listStage: { gap: 10, width: "100%", maxWidth: "100%" },
  listFrame: { width: "100%", maxWidth: "100%", overflow: "hidden" },
  listCard: { width: "100%", alignSelf: "stretch" },
  listCardFull: { width: LIST_CARD_MIN },
  gridStage: { width: "100%", maxWidth: 440, alignSelf: "flex-start" },
  dropZone: {
    maxHeight: badgeBandMaxHeight(LIST_BADGE_ROWS),
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 10,
    width: "100%",
    ...(Platform.OS === "web" ? { overflowY: "auto", overflowX: "hidden" } as unknown as ViewStyle : null),
  },
  badgeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: { position: "relative", maxWidth: "100%" },
  badgeButton: { borderRadius: 999, ...wizardGripStyle },
  badgeMotion: Platform.OS === "web"
    ? { transitionProperty: "opacity", transitionDuration: "200ms" } as unknown as ViewStyle
    : {},
  caption: { lineHeight: 20 },
  listPill: { paddingVertical: 5, paddingHorizontal: 10 },
  listPillText: { fontSize: 12 },
});

function WizardBadgeOrder({ listing, onChange }: Props) {
  const reduced = useReducedMotion();
  const [contentWidth, setContentWidth] = useState(0);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const keys = listing.cardBadges ?? [];
  const pills = listingCardPills(listing);
  const wide = contentWidth >= 820;
  const clipList = contentWidth > 0 && contentWidth < LIST_CARD_FIT;
  const controlIndex = keys.indexOf(activeControl ?? "");
  const controlPill = pills[controlIndex];

  function drop(key: string, target: CardBadgeDropTarget) {
    if (target?.zone !== "card") return;
    if (!pills.some((pill) => pill.key === key)) return;
    const next = applyCardBadgeDrop(keys, key, target);
    if (next.full || sameBadgeKeys(next.keys, keys)) return;
    const label = pills.find((pill) => pill.key === key)!.label;
    setMessage(`${label} is badge ${next.keys.indexOf(key) + 1} of ${next.keys.length}.`);
    onChange(next.keys);
  }

  const drag = useCardBadgeDrag({ pills, onDrop: drop });
  const cardTarget = drag.target?.zone === "card" ? drag.target : null;

  function keyboardProps(key: string): Record<string, unknown> {
    if (Platform.OS !== "web") return {};
    return {
      onKeyDown: (event: { key: string; altKey: boolean; preventDefault: () => void; stopPropagation: () => void }) => {
        const index = keys.indexOf(key);
        if (index < 0 || !event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        drop(key, { zone: "card", index: event.key === "ArrowLeft" ? index - 1 : index + 2 });
      },
    };
  }

  function insertion(index: number) {
    return cardTarget?.index === index ? (
      <View pointerEvents="none" style={styles.insertion} />
    ) : null;
  }

  const listBadges = (
    <View
      {...drag.zoneProps("card")}
      testID="card-badge-drop-zone"
      style={[wizardStyles.dropZone, !!cardTarget && styles.dropZoneActive]}
    >
      <View style={wizardStyles.badgeWrap}>
        {pills.map((pill, index) => {
          const marker = drag.markerProps(pill.key, "card");
          const handle = drag.handleProps(pill.key, "card");
          return (
            <View
              key={pill.key}
              style={[wizardStyles.chip, drag.activeKey === pill.key && styles.dragging]}
            >
              {insertion(index)}
              <Pressable
                {...marker}
                {...handle}
                dataSet={{
                  ...(marker.dataSet as Record<string, string>),
                  ...(handle.dataSet as Record<string, string>),
                }}
                accessibilityRole="button"
                accessibilityLabel={`Arrange ${pill.label}, badge ${index + 1} of ${pills.length}`}
                accessibilityHint="Drag to reorder. Alt and the left or right arrow keys move this badge."
                accessibilityState={{ expanded: activeControl === pill.key }}
                onPress={() => setActiveControl(activeControl === pill.key ? null : pill.key)}
                {...keyboardProps(pill.key)}
                style={[wizardStyles.badgeButton, !reduced && wizardStyles.badgeMotion]}
              >
                <ListingAmberPillView
                  pill={pill}
                  highlight={isHighlightCardBadge(pill.key)}
                  style={[wizardStyles.listPill, activeControl === pill.key ? styles.focusedPill : undefined]}
                  textStyle={wizardStyles.listPillText}
                />
              </Pressable>
            </View>
          );
        })}
        <View style={styles.endMarker}>{insertion(pills.length)}</View>
        {pills.length === 0 ? (
          <LText variant="caption" tone="muted" style={styles.empty}>
            Add details in the earlier steps to see badges on the card.
          </LText>
        ) : null}
      </View>
      {controlPill && !drag.activeKey ? (
        <View style={styles.reorderControls}>
          <LText variant="caption" tone="muted" style={styles.controlLabel}>{controlPill.label}</LText>
          <ReorderButton
            label={`Move ${controlPill.label} earlier`}
            icon="chevron-back"
            disabled={controlIndex === 0}
            onPress={() => drop(controlPill.key, { zone: "card", index: controlIndex - 1 })}
          />
          <ReorderButton
            label={`Move ${controlPill.label} later`}
            icon="chevron-forward"
            disabled={controlIndex === keys.length - 1}
            onPress={() => drop(controlPill.key, { zone: "card", index: controlIndex + 2 })}
          />
          <ReorderButton label="Close badge controls" icon="close" onPress={() => setActiveControl(null)} />
        </View>
      ) : null}
    </View>
  );

  const titleSize = Math.min(60, Math.max(42, contentWidth * 0.046));
  const heading = (
    <View testID="card-customization-heading">
      <WizardHeadline
        title={reviewStep.title}
        subtitle="Every badge on this listing is on the card. Drag to set the order."
        titleStyle={wide ? { fontSize: titleSize, lineHeight: titleSize * 1.16 } : undefined}
      />
    </View>
  );

  const listCard = (
    <View style={clipList ? wizardStyles.listCardFull : wizardStyles.listCard}>
      <ListingResultCard
        listing={listing}
        variant="list"
        interactive={false}
        renderListBadges={() => listBadges}
      />
    </View>
  );

  const listHint = message
    || (Platform.OS === "web"
      ? (clipList
        ? "Swipe the card sideways to the badges, then drag one to set the order."
        : "Drag a badge to set the order. Alt and the arrow keys work too.")
      : "Tap a badge, then move it earlier or later.");

  const listStage = (
    <View testID="list-card-preview" style={wizardStyles.listStage}>
      <View style={wizardStyles.listFrame}>
        {clipList ? (
          <ScrollView horizontal showsHorizontalScrollIndicator style={wizardStyles.listFrame}>
            {listCard}
          </ScrollView>
        ) : listCard}
      </View>
      <LText variant="caption" tone="muted" accessibilityLiveRegion="polite" style={wizardStyles.caption}>
        {listHint}
      </LText>
    </View>
  );

  const gridStage = (
    <View testID="grid-card-preview" style={wizardStyles.gridStage}>
      <ListingResultCard
        listing={listing}
        interactive={false}
        badgeLimit={null}
        badgeMaxRows={2}
      />
      <LText variant="caption" tone="muted" style={styles.cardCaption}>
        Grid view · two rows of badges. Scroll the band if there are more.
      </LText>
    </View>
  );

  return (
    <View style={styles.root} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
      {heading}
      <View style={wizardStyles.stage}>
        {listStage}
        {gridStage}
      </View>
      {drag.overlay}
    </View>
  );
}

export function CardBadgeEditor(props: Props) {
  const { formChrome } = useCreateListingDraft();
  if (formChrome === "edit") return <CardBadgeSubsetEditor {...props} />;
  return <WizardBadgeOrder {...props} />;
}
