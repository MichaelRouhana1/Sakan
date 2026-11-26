import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { Studently } from "@/constants/theme";
import type { Unit } from "@/features/listings/create/v2/model";
import type { PublishQuote } from "@/features/listings/create/v2/useCreationWizard";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export type ReviewLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.reviewVariant";
const LOOK_VARIANTS: readonly ReviewLook[] = ["1", "2"];

function readInitialReviewLook(): ReviewLook {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(LOOK_STORAGE_KEY);
      if (saved === "1" || saved === "2") return saved;
    } catch {
      /* ignore private mode */
    }
  }
  return "2";
}

export function useReviewLook(): [ReviewLook, (next: ReviewLook) => void] {
  const [look, setLookState] = useState<ReviewLook>(readInitialReviewLook);

  function setLook(next: ReviewLook) {
    setLookState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOOK_STORAGE_KEY, next);
      } catch {
        /* ignore private mode */
      }
    }
  }

  return [look, setLook];
}

export function ReviewLookToggle({
  look,
  onChange,
}: {
  look: ReviewLook;
  onChange: (next: ReviewLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="review-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Review step design variant"
      style={styles.toggleTrack}
    >
      {LOOK_VARIANTS.map((mode) => {
        const active = look === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`Design ${mode}`}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(mode)}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
          >
            <LText
              variant="caption"
              style={[styles.toggleLabel, active && styles.toggleLabelActive]}
            >
              {mode}
            </LText>
          </Pressable>
        );
      })}
    </View>
  );
}

function unitSpecSummary(unit: Unit): string {
  const parts: string[] = [];
  if (unit.data.spaceType === "private_room") parts.push("Private room");
  else if (unit.data.spaceType === "shared_room") parts.push("Shared room");
  else if (unit.data.spaceType === "entire_place") parts.push("Whole place");

  if (typeof unit.data.bedrooms === "number" && unit.data.bedrooms > 0) {
    parts.push(`${unit.data.bedrooms} ${unit.data.bedrooms === 1 ? "bed" : "beds"}`);
  } else if (typeof unit.data.beds === "number" && unit.data.beds > 0) {
    parts.push(`${unit.data.beds} ${unit.data.beds === 1 ? "bed" : "beds"}`);
  }

  if (typeof unit.data.bathrooms === "number" && unit.data.bathrooms > 0) {
    parts.push(`${unit.data.bathrooms} ${unit.data.bathrooms === 1 ? "bath" : "baths"}`);
  }

  if (typeof unit.data.areaSqm === "number" && unit.data.areaSqm > 0) {
    parts.push(`${unit.data.areaSqm} m²`);
  }

  return parts.join(" · ");
}

function priceBasisLabel(basis?: string | null): string {
  if (basis === "per_bed_month") return "bed / month";
  if (basis === "per_room_month") return "room / month";
  return "month";
}

function formatRent(amount?: number | string | null): string {
  if (amount == null || amount === "") return "";
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return `$${numeric}`;
}

export function ReviewUnitsLedger({
  units,
  isComplete,
  creditsFor,
  locked,
  onEdit,
  onRemove,
  onAdd,
}: {
  units: Unit[];
  isComplete: (unit: Unit) => boolean;
  creditsFor: (index: number) => number | undefined;
  locked: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const compact = layoutWidth < 600;
  const addDisabled = locked || units.length >= 20;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadLeft}>
          <Text style={styles.sectionHeading}>Units in this place</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>
              {units.length} {units.length === 1 ? "unit" : "units"}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="+ Add another unit"
          accessibilityState={{ disabled: addDisabled }}
          disabled={addDisabled}
          onPress={onAdd}
          style={(state) => [
            styles.addUnitBtn,
            state.hovered && !addDisabled && styles.addUnitBtnHover,
            state.pressed && !addDisabled && styles.addUnitBtnPressed,
            addDisabled && styles.disabled,
          ]}
        >
          <Ionicons name="add" size={designSize(16)} color={Lister.color.ink} />
          <Text style={styles.addUnitText}>Add unit</Text>
        </Pressable>
      </View>

      {units.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="home-outline" size={designSize(22)} color={Lister.color.inkMuted} />
          <Text style={styles.emptyTitle}>No units yet. Add a unit to continue.</Text>
        </View>
      ) : (
        <View accessibilityLabel="Units to review" style={styles.ledger}>
          {units.map((unit, index) => {
            const complete = isComplete(unit);
            const credits = creditsFor(index);
            const photo = unit.data.photos?.[0];
            const photoUri = photo ? resolveMediaUrl(photo.url || photo.uri) ?? photo.uri : null;
            const rent = formatRent(unit.data.monthlyRentUsd);
            const basis = priceBasisLabel(unit.data.priceBasis);
            const specs = unitSpecSummary(unit);

            return (
              <View
                key={unit.id}
                testID="creation-unit-row"
                style={[
                  styles.unitRow,
                  index > 0 && styles.unitRowBorder,
                  compact && styles.unitRowCompact,
                ]}
              >
                <View style={styles.unitMain}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={[styles.thumb, compact && styles.thumbCompact]}
                      contentFit="cover"
                      accessibilityLabel={`Unit ${index + 1} cover`}
                    />
                  ) : (
                    <View style={[styles.thumbEmpty, compact && styles.thumbCompact]}>
                      <Ionicons name="image-outline" size={designSize(20)} color={Lister.color.inkFaint} />
                    </View>
                  )}

                  <View style={styles.unitBody}>
                    <View style={styles.unitMetaRow}>
                      <Text style={styles.unitIndex}>Unit {index + 1}</Text>
                      <View style={[styles.statusPill, complete ? styles.statusReady : styles.statusNeeds]}>
                        <View style={[styles.statusDot, complete ? styles.dotReady : styles.dotNeeds]} />
                        <Text style={[styles.statusText, complete ? styles.statusTextReady : styles.statusTextNeeds]}>
                          {complete ? "Ready" : "Needs details"}
                        </Text>
                      </View>
                      {credits !== undefined ? (
                        <View style={styles.creditPill}>
                          <Text style={styles.creditPillText}>
                            {credits} {credits === 1 ? "credit" : "credits"}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.unitTitle} numberOfLines={2}>
                      {unit.data.title || "Untitled unit"}
                    </Text>

                    <View style={styles.unitDetailRow}>
                      <Text style={styles.unitRent}>
                        {rent || "Add rent"}
                        {rent ? <Text style={styles.unitBasis}> / {basis}</Text> : null}
                      </Text>
                      {specs ? <Text style={styles.unitSpecs}>· {specs}</Text> : null}
                    </View>
                  </View>
                </View>

                {!locked ? (
                  <View style={[styles.unitActions, compact && styles.unitActionsCompact]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit unit ${index + 1}`}
                      onPress={() => onEdit(unit.id)}
                      style={(state) => [
                        styles.editBtn,
                        state.hovered && styles.editBtnHover,
                        state.pressed && styles.editBtnPressed,
                      ]}
                    >
                      <Ionicons name="create-outline" size={designSize(15)} color={Lister.color.ink} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove unit ${index + 1}`}
                      onPress={() => onRemove(unit.id)}
                      style={(state) => [
                        styles.removeBtn,
                        state.hovered && styles.removeBtnHover,
                        state.pressed && styles.removeBtnPressed,
                      ]}
                    >
                      {(state) => (
                        <Ionicons
                          name="trash-outline"
                          size={designSize(16)}
                          color={state.hovered ? Lister.color.danger : Lister.color.inkMuted}
                        />
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {units.length >= 20 ? (
        <Text style={styles.limitNote}>You’ve reached the limit of 20 units in this batch.</Text>
      ) : null}
    </View>
  );
}

export function ReviewCostLedger({
  unitCount,
  quote,
  quoteReady,
  quoteError,
  afford,
  onRetry,
  onBuyCredits,
}: {
  unitCount: number;
  quote?: PublishQuote;
  quoteReady: boolean;
  quoteError: boolean;
  afford: boolean;
  onRetry: () => void;
  onBuyCredits: () => void;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const remaining = quoteReady && quote ? quote.balance - quote.total : 0;

  return (
    <View style={styles.costCard} accessibilityLabel="Credit total">
      <View style={styles.costHeader}>
        <Text style={styles.sectionHeading}>Publishing cost</Text>
        {unitCount > 0 && quoteReady ? (
          <View style={[styles.statusPill, afford ? styles.statusReady : styles.statusNeeds]}>
            <View style={[styles.statusDot, afford ? styles.dotReady : styles.dotNeeds]} />
            <Text style={[styles.statusText, afford ? styles.statusTextReady : styles.statusTextNeeds]}>
              {afford ? "Covered" : "More credits needed"}
            </Text>
          </View>
        ) : null}
      </View>

      {unitCount === 0 ? (
        <Text style={styles.costHelper}>Add a unit to see the total.</Text>
      ) : quoteError ? (
        <View style={styles.costErrorRow}>
          <Text accessibilityRole="alert" style={styles.costErrorText}>
            Couldn’t load the credit total.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry credit total"
            onPress={onRetry}
            style={(state) => [styles.secondaryBtn, state.hovered && styles.secondaryBtnHover]}
          >
            <Text style={styles.secondaryBtnText}>Retry credit total</Text>
          </Pressable>
        </View>
      ) : quoteReady && quote ? (
        <View style={styles.costRows}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>
              Total for {unitCount} {unitCount === 1 ? "unit" : "units"}
            </Text>
            <Text style={styles.costTotalValue}>
              {quote.total} {quote.total === 1 ? "credit" : "credits"}
            </Text>
          </View>

          <View style={[styles.costRow, styles.costRowHairline]}>
            <Text style={styles.costMutedLabel}>Your balance</Text>
            <Text style={styles.costMutedValue}>
              {quote.balance} {quote.balance === 1 ? "credit" : "credits"}
            </Text>
          </View>

          {afford ? (
            <View style={[styles.costRow, styles.costRowHairline]}>
              <Text style={styles.costMutedLabel}>Remaining after publish</Text>
              <Text style={styles.costRemainingValue}>
                {remaining} {remaining === 1 ? "credit" : "credits"}
              </Text>
            </View>
          ) : (
            <View style={styles.insufficientBox}>
              <View style={styles.insufficientCopy}>
                <Ionicons name="alert-circle-outline" size={designSize(18)} color={Lister.color.danger} />
                <Text accessibilityRole="alert" style={styles.insufficientText}>
                  You need more credits to publish this batch.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buy credits"
                onPress={onBuyCredits}
                style={(state) => [
                  styles.buyBtn,
                  state.hovered && styles.buyBtnHover,
                  state.pressed && styles.buyBtnPressed,
                ]}
              >
                <Text style={styles.buyBtnText}>Buy credits</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.costFootnote}>All units publish together under this place.</Text>
        </View>
      ) : (
        <Text role="status" style={styles.costHelper}>
          Checking credit total…
        </Text>
      )}
    </View>
  );
}

const webCursor = Platform.OS === "web" ? ({ cursor: "pointer" } as unknown as ViewStyle) : {};
const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "background-color, border-color, color",
        transitionDuration: "160ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      } as unknown as ViewStyle)
    : {};

const baseStyles = StyleSheet.create({
  toggleTrack: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4E1DC",
    backgroundColor: "#F6F5F3",
    gap: 2,
  },
  toggleItem: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...webCursor,
    ...webTransition,
  },
  toggleItemActive: {
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 1px 2px rgba(28, 25, 23, 0.10)" } as unknown as ViewStyle)
      : {}),
  },
  toggleLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: "#6B6460",
  },
  toggleLabelActive: {
    color: "#1C1917",
  },

  section: {
    gap: 14,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  sectionHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeading: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: "#1C1917",
  },
  countChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F4F2EE",
  },
  countChipText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: "#5C5752",
    fontVariant: ["tabular-nums"],
  },

  addUnitBtn: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DEDAD5",
    backgroundColor: "#FFFFFF",
    ...webCursor,
    ...webTransition,
  },
  addUnitBtnHover: {
    borderColor: "#1C1917",
    backgroundColor: "#FAF9F7",
  },
  addUnitBtnPressed: {
    backgroundColor: "#F2EFEA",
  },
  addUnitText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#1C1917",
  },
  disabled: {
    opacity: 0.45,
  },

  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E2DD",
    backgroundColor: "#FAF9F7",
  },
  emptyTitle: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: "#5C5752",
  },

  ledger: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E2DD",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  unitRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#ECEAE6",
  },
  unitRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  unitMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#F4F2EE",
    borderWidth: 1,
    borderColor: "#ECEAE6",
    flexShrink: 0,
  },
  thumbCompact: {
    width: 56,
    height: 56,
  },
  thumbEmpty: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#F6F5F3",
    borderWidth: 1,
    borderColor: "#E7E5E2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unitBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  unitMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  unitIndex: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: "#5C5752",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusReady: {
    backgroundColor: "#EFFBF2",
  },
  statusNeeds: {
    backgroundColor: "#FEF3F2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotReady: {
    backgroundColor: "#16A34A",
  },
  dotNeeds: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 11,
    lineHeight: 15,
  },
  statusTextReady: {
    color: "#166534",
  },
  statusTextNeeds: {
    color: "#B42318",
  },
  creditPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#F4F2EE",
  },
  creditPillText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: "#5C5752",
    fontVariant: ["tabular-nums"],
  },
  unitTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: "#1C1917",
  },
  unitDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  unitRent: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: "#1C1917",
    fontVariant: ["tabular-nums"],
  },
  unitBasis: {
    fontFamily: Studently.type.body,
    color: "#6B6460",
  },
  unitSpecs: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B6460",
  },

  unitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  unitActionsCompact: {
    justifyContent: "flex-end",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F2F0EC",
  },
  editBtn: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEDAD5",
    backgroundColor: "#FFFFFF",
    ...webCursor,
    ...webTransition,
  },
  editBtnHover: {
    borderColor: "#1C1917",
    backgroundColor: "#FAF9F7",
  },
  editBtnPressed: {
    backgroundColor: "#F2EFEA",
  },
  editBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#1C1917",
  },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    ...webCursor,
    ...webTransition,
  },
  removeBtnHover: {
    backgroundColor: "#FEF3F2",
    borderColor: "#F5C2BD",
  },
  removeBtnPressed: {
    backgroundColor: "#FDE7E5",
  },

  limitNote: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B6460",
  },

  costCard: {
    marginTop: 32,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E2DD",
    backgroundColor: "#FAF9F7",
    gap: 14,
  },
  costHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  costRows: {
    gap: 0,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  costRowHairline: {
    borderTopWidth: 1,
    borderTopColor: "#EAE7E2",
  },
  costLabel: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: "#1C1917",
  },
  costTotalValue: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    color: "#1C1917",
    fontVariant: ["tabular-nums"],
  },
  costMutedLabel: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: "#5C5752",
  },
  costMutedValue: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: "#37332F",
    fontVariant: ["tabular-nums"],
  },
  costRemainingValue: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: "#166534",
    fontVariant: ["tabular-nums"],
  },
  costHelper: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: "#5C5752",
  },
  costFootnote: {
    marginTop: 6,
    fontFamily: Studently.type.body,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B6460",
  },
  costErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  costErrorText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: "#B42318",
  },
  secondaryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DEDAD5",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...webCursor,
    ...webTransition,
  },
  secondaryBtnHover: {
    borderColor: "#1C1917",
  },
  secondaryBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#1C1917",
  },

  insufficientBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1C5C0",
    backgroundColor: "#FEF3F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  insufficientCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  insufficientText: {
    flex: 1,
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: "#B42318",
  },
  buyBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#EA3F4A",
    alignItems: "center",
    justifyContent: "center",
    ...webCursor,
    ...webTransition,
  },
  buyBtnHover: {
    backgroundColor: "#D6333E",
  },
  buyBtnPressed: {
    backgroundColor: "#C12833",
  },
  buyBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
});
