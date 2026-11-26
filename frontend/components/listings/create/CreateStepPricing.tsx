import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { DatePicker } from "@/components/listings/create/DatePicker";
import { formatWizardDate, todayIsoDate } from "@/components/listings/create/dateValue";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { StepperControl } from "@/components/listings/create/StepperControl";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
} from "@/components/listings/create/WizardField";
import {
  LEASE_TERM_OPTIONS,
  PAYMENT_MODALITY_OPTIONS,
} from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import {
  monthlyRentFieldLabel,
  priceBasisForSpaceType,
} from "@/lib/bedsAvailability";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { LeaseTerm, PaymentModality, PriceBasis } from "@/types/listing";
import { usePriceGuide } from "@/features/listings/usePriceGuide";
import { PriceGuideCard } from "./PriceGuideCard";

const MAX_PREVIEW_RENT_USD = 50_000;

const BASIS_UNIT_TAG: Record<PriceBasis, string> = {
  per_unit_month: "USD / month",
  per_room_month: "USD / room",
  per_bed_month: "USD / bed",
};

const DEPOSIT_OPTIONS = [
  { value: "none" as const, label: "No deposit" },
  { value: "1" as const, label: "1 month" },
  { value: "2" as const, label: "2 months" },
  { value: "custom" as const, label: "Custom" },
];

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function SelectionIndicator({
  selected,
  hovered,
  reducedMotion,
}: {
  selected: boolean;
  hovered?: boolean;
  reducedMotion: boolean;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  return (
    <View
      style={[
        styles.indicator,
        hovered && !selected && styles.indicatorHover,
        selected && styles.indicatorSelected,
        !reducedMotion && webIndicatorTransition,
      ]}
    >
      {selected ? (
        <Ionicons
          name="checkmark"
          size={designSize(12)}
          color={Lister.color.surface}
        />
      ) : null}
    </View>
  );
}

export function CreateStepPricing() {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const compact = layoutWidth < 520;
  const reducedMotion = useReducedMotion();

  const { draft, patch } = useListingForm();
  const [rentFocused, setRentFocused] = useState(false);
  const [depositFocused, setDepositFocused] = useState(false);

  const guide = usePriceGuide(draft);
  const rentInvalid = useWizardFieldInvalid("monthlyRentUsd");
  const bedsAvailableInvalid = useWizardFieldInvalid("bedsAvailable");
  const depositInvalid = useWizardFieldInvalid("securityDepositUsd");
  const depositChoiceInvalid = useWizardFieldInvalid("depositPreset");
  const leaseInvalid = useWizardFieldInvalid("leaseTerm");
  const availableInvalid = useWizardFieldInvalid("availableFrom");
  const paymentInvalid = useWizardFieldInvalid("paymentModality");

  const rentLabel = monthlyRentFieldLabel(draft.spaceType);
  const priceBasis = draft.spaceType
    ? priceBasisForSpaceType(draft.spaceType)
    : draft.priceBasis;
  const unitTag = priceBasis ? BASIS_UNIT_TAG[priceBasis] : "USD / month";

  const bedsMax = Math.max(draft.beds, 1);
  const bedsAvailable =
    draft.bedsAvailable == null
      ? Math.min(bedsMax, Math.max(1, draft.beds))
      : draft.bedsAvailable;

  const parsedRent = Number(draft.monthlyRentUsd);
  const validRent =
    draft.monthlyRentUsd.trim() !== "" &&
    Number.isInteger(parsedRent) &&
    parsedRent > 0 &&
    parsedRent <= MAX_PREVIEW_RENT_USD
      ? parsedRent
      : null;

  const parsedCustomDeposit = Number(draft.securityDepositUsd);
  const validCustomDeposit =
    draft.securityDepositUsd.trim() !== "" &&
    Number.isInteger(parsedCustomDeposit) &&
    parsedCustomDeposit >= 0
      ? parsedCustomDeposit
      : null;

  function depositSublabel(preset: (typeof DEPOSIT_OPTIONS)[number]["value"]): string {
    if (preset === "none") return "$0 upfront";
    if (preset === "1") return validRent != null ? formatUsd(validRent) : "1× monthly rent";
    if (preset === "2") return validRent != null ? formatUsd(validRent * 2) : "2× monthly rent";
    return validCustomDeposit != null ? formatUsd(validCustomDeposit) : "Enter USD";
  }

  const moveInMode: "immediate" | "date" | null =
    draft.availableImmediate === true
      ? "immediate"
      : draft.availableImmediate === false || Boolean(draft.availableFrom)
        ? "date"
        : null;

  const moveInTrackInvalid = availableInvalid && moveInMode === null;

  const summaryParts: string[] = [];
  if (validRent != null) {
    const basisWord =
      priceBasis === "per_bed_month"
        ? "/ bed / mo"
        : priceBasis === "per_room_month"
          ? "/ room / mo"
          : "/ month";
    summaryParts.push(`${formatUsd(validRent)} ${basisWord}`);
  }
  if (draft.depositPreset === "none") {
    summaryParts.push("No deposit");
  } else if (draft.depositPreset === "1" && validRent != null) {
    summaryParts.push(`${formatUsd(validRent)} deposit`);
  } else if (draft.depositPreset === "2" && validRent != null) {
    summaryParts.push(`${formatUsd(validRent * 2)} deposit`);
  } else if (draft.depositPreset === "custom" && validCustomDeposit != null) {
    summaryParts.push(`${formatUsd(validCustomDeposit)} deposit`);
  }
  const leaseLabel = LEASE_TERM_OPTIONS.find((o) => o.value === draft.leaseTerm)?.label;
  if (leaseLabel) summaryParts.push(`${leaseLabel} min.`);
  if (moveInMode === "immediate") {
    summaryParts.push("Available immediately");
  } else if (moveInMode === "date" && draft.availableFrom) {
    summaryParts.push(`From ${formatWizardDate(draft.availableFrom)}`);
  }
  const paymentLabel = PAYMENT_MODALITY_OPTIONS.find((o) => o.value === draft.paymentModality)?.label;
  if (paymentLabel) summaryParts.push(paymentLabel);

  const tileTransition = !reducedMotion ? webTileTransition : null;

  return (
    <View style={styles.root}>
      {/* 1. Monthly Rent Ledger Input */}
      <Enter>
        <View style={styles.sectionFirst}>
          <WizardFieldLabel required>{rentLabel}</WizardFieldLabel>
          <View
            style={[
              styles.currencyShell,
              rentFocused && styles.currencyShellFocused,
              rentInvalid && styles.currencyShellInvalid,
            ]}
          >
            <LText
              style={[
                styles.currencyPrefix,
                !draft.monthlyRentUsd && styles.currencyPrefixEmpty,
              ]}
            >
              $
            </LText>
            <TextInput
              accessibilityLabel={rentLabel}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="650"
              placeholderTextColor={Lister.color.inkFaint}
              value={draft.monthlyRentUsd}
              onFocus={() => setRentFocused(true)}
              onBlur={() => setRentFocused(false)}
              onChangeText={(raw) => patch({ monthlyRentUsd: raw.replace(/[^\d]/g, "") })}
              style={styles.currencyInput}
            />
            <View style={styles.unitBadge}>
              <LText variant="caption" style={styles.unitBadgeText}>
                {unitTag}
              </LText>
            </View>
          </View>
        </View>
      </Enter>

      {draft.spaceType === "shared_room" ? (
        <Enter delay={40}>
          <View style={styles.bedsBlock}>
            <StepperControl
              label="Beds available"
              value={bedsAvailable}
              min={1}
              max={bedsMax}
              required
              error={bedsAvailableInvalid}
              onChange={(next) => patch({ bedsAvailable: next })}
            />
            <LText variant="caption" tone="muted">
              One price per bed. Set how many beds you can rent now (up to {bedsMax}).
            </LText>
          </View>
        </Enter>
      ) : null}

      {guide && priceBasis ? (
        <PriceGuideCard
          guide={guide}
          priceBasis={priceBasis}
          onUse={() => patch({ monthlyRentUsd: String(guide.medianUsd) })}
        />
      ) : null}

      {/* 2. Security Deposit — 4-up Architectural Grid + Progressive Custom Input */}
      <Enter delay={70}>
        <View style={styles.section}>
          <WizardFieldLabel required>Security deposit</WizardFieldLabel>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Security deposit"
            style={[
              styles.tileGrid,
              depositChoiceInvalid && styles.groupError,
            ]}
          >
            {DEPOSIT_OPTIONS.map((opt) => {
              const selected = draft.depositPreset === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: selected }}
                  onPress={() => patch({ depositPreset: opt.value })}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.depositTile,
                    compact ? styles.tileHalf : styles.tileQuarter,
                    tileTransition,
                    hovered && !selected && styles.tileHover,
                    selected && styles.depositTileSelected,
                    pressed && (!reducedMotion ? styles.tilePressedScale : styles.tilePressedFade),
                  ]}
                >
                  {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                    <>
                      <View style={styles.depositTopRow}>
                        <LText
                          variant="caption"
                          numberOfLines={1}
                          style={[styles.tileTitle, selected && styles.tileTitleSelected]}
                        >
                          {opt.label}
                        </LText>
                        <SelectionIndicator
                          selected={selected}
                          hovered={hovered}
                          reducedMotion={reducedMotion}
                        />
                      </View>
                      <LText
                        variant="caption"
                        numberOfLines={1}
                        style={[styles.tileMeta, selected && styles.tileMetaSelected]}
                      >
                        {depositSublabel(opt.value)}
                      </LText>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>

          {draft.depositPreset === "custom" ? (
            <View style={styles.customDepositWrap}>
              <WizardFieldLabel required style={styles.subFieldLabel}>
                Deposit amount (USD)
              </WizardFieldLabel>
              <View
                style={[
                  styles.compactCurrencyShell,
                  depositFocused && styles.currencyShellFocused,
                  depositInvalid && styles.currencyShellInvalid,
                ]}
              >
                <LText
                  style={[
                    styles.compactCurrencyPrefix,
                    !draft.securityDepositUsd && styles.currencyPrefixEmpty,
                  ]}
                >
                  $
                </LText>
                <TextInput
                  accessibilityLabel="Deposit amount in USD"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="Amount in USD"
                  placeholderTextColor={Lister.color.inkFaint}
                  value={draft.securityDepositUsd}
                  onFocus={() => setDepositFocused(true)}
                  onBlur={() => setDepositFocused(false)}
                  onChangeText={(raw) =>
                    patch({ securityDepositUsd: raw.replace(/[^\d]/g, "") })
                  }
                  style={styles.compactCurrencyInput}
                />
                <LText variant="caption" tone="muted" style={styles.inlineCurrencyCode}>
                  USD
                </LText>
              </View>
            </View>
          ) : null}
        </View>
      </Enter>

      {/* 3. Minimum Lease — Flush Architectural Option Grid */}
      <Enter delay={130}>
        <View style={styles.section}>
          <WizardFieldLabel required>Minimum lease</WizardFieldLabel>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Minimum lease"
            style={[styles.tileGrid, leaseInvalid && styles.groupError]}
          >
            {LEASE_TERM_OPTIONS.map((opt) => {
              const selected = draft.leaseTerm === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: selected }}
                  onPress={() => patch({ leaseTerm: opt.value as LeaseTerm })}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.choiceTile,
                    compact ? styles.tileHalf : styles.tileThird,
                    tileTransition,
                    hovered && !selected && styles.tileHover,
                    selected && styles.choiceTileSelected,
                    pressed && (!reducedMotion ? styles.tilePressedScale : styles.tilePressedFade),
                  ]}
                >
                  {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                    <>
                      <SelectionIndicator
                        selected={selected}
                        hovered={hovered}
                        reducedMotion={reducedMotion}
                      />
                      <LText
                        variant="caption"
                        numberOfLines={1}
                        style={[styles.tileTitle, selected && styles.tileTitleSelected]}
                      >
                        {opt.label}
                      </LText>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Enter>

      {/* 4. Move-in — Recessed 2-Segment Switcher + Progressive DatePicker */}
      <Enter delay={180}>
        <View style={styles.section}>
          <WizardFieldLabel required>Move-in</WizardFieldLabel>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Move-in availability"
            style={[
              styles.segmentedWell,
              moveInTrackInvalid && styles.segmentedWellInvalid,
            ]}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Available immediately"
              accessibilityState={{ checked: moveInMode === "immediate" }}
              onPress={() => patch({ availableImmediate: true, availableFrom: "" })}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.segmentOption,
                tileTransition,
                hovered && moveInMode !== "immediate" && styles.segmentHover,
                moveInMode === "immediate" && styles.segmentActive,
                pressed && styles.tilePressedFade,
              ]}
            >
              {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                <>
                  <SelectionIndicator
                    selected={moveInMode === "immediate"}
                    hovered={hovered}
                    reducedMotion={reducedMotion}
                  />
                  <LText
                    variant="caption"
                    numberOfLines={1}
                    style={[
                      styles.segmentLabel,
                      moveInMode === "immediate" && styles.segmentLabelActive,
                    ]}
                  >
                    Available now
                  </LText>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Specific date"
              accessibilityState={{ checked: moveInMode === "date" }}
              onPress={() => {
                if (moveInMode !== "date") {
                  patch({ availableImmediate: false });
                }
              }}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.segmentOption,
                tileTransition,
                hovered && moveInMode !== "date" && styles.segmentHover,
                moveInMode === "date" && styles.segmentActive,
                pressed && styles.tilePressedFade,
              ]}
            >
              {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                <>
                  <SelectionIndicator
                    selected={moveInMode === "date"}
                    hovered={hovered}
                    reducedMotion={reducedMotion}
                  />
                  <LText
                    variant="caption"
                    numberOfLines={1}
                    style={[
                      styles.segmentLabel,
                      moveInMode === "date" && styles.segmentLabelActive,
                    ]}
                  >
                    Specific date
                  </LText>
                </>
              )}
            </Pressable>
          </View>

          {moveInMode === "date" ? (
            <View style={styles.dateReveal}>
              <DatePicker
                testID="available-from"
                accessibilityLabel="Available from date"
                placeholder="Select move-in date"
                value={draft.availableFrom}
                minDate={todayIsoDate()}
                invalid={availableInvalid}
                onChange={(availableFrom) =>
                  patch({ availableFrom, availableImmediate: false })
                }
              />
            </View>
          ) : moveInMode === "immediate" ? (
            <LText variant="caption" tone="muted" style={styles.moveInHint}>
              Renters see “Available now” on your listing card.
            </LText>
          ) : null}
        </View>
      </Enter>

      {/* 5. Payment — Flush 3-Column Architectural Option Row */}
      <Enter delay={220}>
        <View style={styles.section}>
          <WizardFieldLabel required>Payment</WizardFieldLabel>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Payment"
            style={[styles.tileGrid, paymentInvalid && styles.groupError]}
          >
            {PAYMENT_MODALITY_OPTIONS.map((opt) => {
              const selected = draft.paymentModality === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: selected }}
                  onPress={() => patch({ paymentModality: opt.value as PaymentModality })}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.choiceTile,
                    compact ? styles.tileFull : styles.tileAuto,
                    tileTransition,
                    hovered && !selected && styles.tileHover,
                    selected && styles.choiceTileSelected,
                    pressed && (!reducedMotion ? styles.tilePressedScale : styles.tilePressedFade),
                  ]}
                >
                  {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                    <>
                      <SelectionIndicator
                        selected={selected}
                        hovered={hovered}
                        reducedMotion={reducedMotion}
                      />
                      <LText
                        variant="caption"
                        numberOfLines={1}
                        style={[styles.tileTitle, selected && styles.tileTitleSelected]}
                      >
                        {opt.label}
                      </LText>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Enter>

      {/* Live Terms Readout */}
      {summaryParts.length >= 2 ? (
        <View style={styles.summaryStrip} accessibilityLiveRegion="polite">
          <LText variant="caption" tone="muted" style={styles.summaryLabel}>
            Renter summary
          </LText>
          <LText variant="body" style={styles.summaryValue}>
            {summaryParts.join(" · ")}
          </LText>
        </View>
      ) : null}
    </View>
  );
}

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as ViewStyle) : {};

const webPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

const webTileTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, transform",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const webIndicatorTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, transform",
        transitionDuration: "160ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const baseStyles = StyleSheet.create({
  root: {
    gap: 24,
  },
  sectionFirst: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  bedsBlock: {
    gap: 6,
  },

  /* Currency Ledger Input */
  currencyShell: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    gap: 2,
  },
  compactCurrencyShell: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    gap: 3,
  },
  currencyShellFocused: {
    borderWidth: 2,
    paddingLeft: 15,
    paddingRight: 11,
    borderColor: Lister.color.ink,
  },
  currencyShellInvalid: {
    borderWidth: 2,
    paddingLeft: 15,
    paddingRight: 11,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  currencyPrefix: {
    fontFamily: Lister.type.display,
    fontSize: 24,
    lineHeight: 30,
    color: Lister.color.ink,
  },
  compactCurrencyPrefix: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: Lister.color.ink,
  },
  currencyPrefixEmpty: {
    color: Lister.color.inkFaint,
  },
  currencyInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontFamily: Lister.type.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Lister.color.ink,
    fontVariant: ["tabular-nums"],
    ...(webNoOutline as object),
  },
  compactCurrencyInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    color: Lister.color.ink,
    fontVariant: ["tabular-nums"],
    ...(webNoOutline as object),
  },
  inlineCurrencyCode: {
    fontFamily: Lister.type.bodyMedium,
  },
  unitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Lister.radius.sm,
    backgroundColor: Lister.color.surfaceMuted,
  },
  unitBadgeText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    color: Lister.color.inkMuted,
  },

  /* Selection Indicator Ring / Check Badge */
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indicatorHover: {
    borderColor: Lister.color.borderStrong,
  },
  indicatorSelected: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },

  /* Architectural Option Grids (zero-shift 1px -> 2px border compensation) */
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupError: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.dangerSoft,
    padding: 6,
  },
  depositTile: {
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    justifyContent: "space-between",
    gap: 4,
    ...webPointer,
  },
  depositTileSelected: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderColor: Lister.color.ink,
    backgroundColor: Lister.color.bg,
  },
  depositTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  choiceTile: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    ...webPointer,
  },
  choiceTileSelected: {
    borderWidth: 2,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderColor: Lister.color.ink,
    backgroundColor: Lister.color.bg,
  },
  tileQuarter: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 112,
  },
  tileThird: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 136,
  },
  tileAuto: {
    flexGrow: 1,
  },
  tileHalf: {
    flexGrow: 1,
    flexBasis: "46%",
  },
  tileFull: {
    width: "100%",
  },
  tileHover: {
    backgroundColor: Lister.color.bg,
    borderColor: Lister.color.borderStrong,
  },
  tilePressedScale: {
    transform: [{ scale: 0.985 }],
  },
  tilePressedFade: {
    opacity: 0.9,
  },
  tileTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: Lister.color.ink,
    flexShrink: 1,
  },
  tileTitleSelected: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  tileMeta: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  tileMetaSelected: {
    fontFamily: Lister.type.bodyMedium,
    color: Lister.color.ink,
  },
  customDepositWrap: {
    marginTop: 4,
    gap: 6,
  },
  subFieldLabel: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* Recessed 2-Segment Switcher */
  segmentedWell: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 4,
    gap: 4,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  segmentedWellInvalid: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  segmentOption: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...webPointer,
  },
  segmentHover: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  segmentActive: {
    backgroundColor: Lister.color.surface,
    borderColor: Lister.color.ink,
  },
  segmentLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: Lister.color.inkMuted,
  },
  segmentLabelActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  dateReveal: {
    marginTop: -2,
  },
  moveInHint: {
    marginTop: 2,
  },

  /* Live Terms Readout */
  summaryStrip: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
    gap: 3,
  },
  summaryLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
  },
  summaryValue: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 14,
    lineHeight: 21,
    color: Lister.color.ink,
    fontVariant: ["tabular-nums"],
  },
});
