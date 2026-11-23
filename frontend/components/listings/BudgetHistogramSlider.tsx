import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PanResponder,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Studently } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  countListingsInRange,
  DEFAULT_RENT_MAX,
  DEFAULT_RENT_MIN,
  DEFAULT_RENT_STEP,
  formatBucketLabel,
  hasVisibleHistogram,
  isBucketInRange,
  sliderPercent,
  snapToStep,
  type PriceHistogram,
} from "@/types/priceHistogram";

export type BudgetHistogramSliderProps = {
  minRentUsd: number | null;
  maxRentUsd: number | null;
  histogram?: PriceHistogram | null;
  /** Fires live during drag or valid edits (use for draft state in dialogs/panels). */
  onChange?: (min: number | null, max: number | null) => void;
  /** Fires once on thumb release, blur, or debounced typing (use for auto-apply dropdown). */
  onCommit?: (min: number | null, max: number | null) => void;
  /** Lets parent ScrollView lock vertical scrolling while dragging thumbs on native. */
  onDragStateChange?: (dragging: boolean) => void;
  /** Optional validation error message shown beneath the inputs. */
  error?: string | null;
  /** Slightly tighter chart height for dropdown popover vs full modal/sheet. */
  compact?: boolean;
};

function normalizeRange(
  lo: number,
  hi: number,
  minBound: number,
  ceiling: number,
): [number | null, number | null] {
  const clampedLo = Math.max(minBound, Math.min(lo, hi));
  const clampedHi = Math.max(clampedLo, hi);
  return [
    clampedLo <= minBound ? null : Math.round(clampedLo),
    clampedHi >= ceiling ? null : Math.round(clampedHi),
  ];
}

export function BudgetHistogramSlider({
  minRentUsd,
  maxRentUsd,
  histogram,
  onChange,
  onCommit,
  onDragStateChange,
  error,
  compact = false,
}: BudgetHistogramSliderProps) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const reducedMotion = useReducedMotion();
  const rawId = useId();
  const sliderScope = useMemo(
    () => `sk-budget-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId],
  );

  const showHistogram = hasVisibleHistogram(histogram);
  const minBound = showHistogram ? histogram.minUsd : DEFAULT_RENT_MIN;
  const ceiling = showHistogram ? histogram.maxUsd : DEFAULT_RENT_MAX;
  const step = showHistogram ? histogram.stepUsd : DEFAULT_RENT_STEP;

  const propLo =
    minRentUsd != null
      ? Math.max(minBound, Math.min(ceiling, minRentUsd))
      : minBound;
  const propHi =
    maxRentUsd != null
      ? Math.max(propLo, Math.min(ceiling, maxRentUsd))
      : ceiling;

  // Local draft keeps 60fps bar/thumb updates during drag without spamming API commits.
  const [draft, setDraft] = useState<{ lo: number; hi: number } | null>(null);
  const draftRef = useRef<{ lo: number; hi: number } | null>(null);
  const lowInputRef = useRef<HTMLInputElement | null>(null);
  const highInputRef = useRef<HTMLInputElement | null>(null);
  const setDraftSynced = useCallback(
    (next: { lo: number; hi: number } | null) => {
      draftRef.current = next;
      setDraft(next);
    },
    [],
  );

  const lo = draft ? draft.lo : propLo;
  const hi = draft ? draft.hi : propHi;
  const hasAboveCeilingMax =
    !draft && maxRentUsd != null && maxRentUsd > ceiling;

  // Text input editing state so typing doesn't jump mid-keystroke.
  const [editingField, setEditingField] = useState<"min" | "max" | null>(null);
  const [editText, setEditText] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Web hover readout state.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const clearPendingDebounce = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const emitChange = useCallback(
    (nextLo: number, nextHi: number) => {
      const [minVal, maxVal] = normalizeRange(nextLo, nextHi, minBound, ceiling);
      onChange?.(minVal, maxVal);
    },
    [onChange, minBound, ceiling],
  );

  const emitCommit = useCallback(
    (nextLo: number, nextHi: number) => {
      clearPendingDebounce();
      const [minVal, maxVal] = normalizeRange(nextLo, nextHi, minBound, ceiling);
      onCommit?.(minVal, maxVal);
    },
    [clearPendingDebounce, onCommit, minBound, ceiling],
  );

  const handleSliderDraft = useCallback(
    (nextLo: number, nextHi: number) => {
      const clampedLo = Math.max(minBound, Math.min(nextLo, nextHi));
      const clampedHi = Math.min(ceiling, Math.max(nextLo, nextHi));
      setDraftSynced({ lo: clampedLo, hi: clampedHi });
      emitChange(clampedLo, clampedHi);
    },
    [minBound, ceiling, setDraftSynced, emitChange],
  );

  const flushDragCommit = useCallback(() => {
    const active = draftRef.current;
    if (!active) return;
    setDraftSynced(null);
    emitCommit(active.lo, active.hi);
  }, [setDraftSynced, emitCommit]);

  // HTML5 `change` on <input type="range"> fires once upon drag release or keyboard/programmatic commit.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const low = lowInputRef.current;
    const high = highInputRef.current;
    const onNativeChange = () => flushDragCommit();
    low?.addEventListener("change", onNativeChange);
    high?.addEventListener("change", onNativeChange);
    return () => {
      low?.removeEventListener("change", onNativeChange);
      high?.removeEventListener("change", onNativeChange);
    };
  }, [flushDragCommit]);

  // Measurements & dimensions.
  const isWeb = Platform.OS === "web";
  const thumbSize = designSize(isWeb ? 18 : 24);
  const thumbRadius = thumbSize / 2;
  const railHeight = designSize(4);
  const barAreaHeight = designSize(compact ? 52 : 60);

  // Native PanResponder dual-thumb slider.
  const [nativeTrackWidth, setNativeTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const activeThumbRef = useRef<"low" | "high" | null>(null);
  const latestValuesRef = useRef({ lo, hi, minBound, ceiling, step });
  latestValuesRef.current = { lo, hi, minBound, ceiling, step };

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    const w = event.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setNativeTrackWidth(w);
  }, []);

  const valueFromLocationX = useCallback((locationX: number) => {
    const w = trackWidthRef.current;
    const { minBound: mn, ceiling: mx, step: st } = latestValuesRef.current;
    if (w <= 0) return mn;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    return snapToStep(mn + ratio * (mx - mn), mn, mx, st);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gs: PanResponderGestureState) =>
          Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 2,
        onMoveShouldSetPanResponderCapture: (_e, gs: PanResponderGestureState) =>
          Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          onDragStateChange?.(true);
          const x = e.nativeEvent.locationX;
          const val = valueFromLocationX(x);
          const { lo: curLo, hi: curHi } = latestValuesRef.current;
          const distLo = Math.abs(val - curLo);
          const distHi = Math.abs(val - curHi);
          const target: "low" | "high" =
            distLo === distHi ? (val < curLo ? "low" : "high") : distLo < distHi ? "low" : "high";
          activeThumbRef.current = target;
          if (target === "low") {
            handleSliderDraft(Math.min(val, curHi), curHi);
          } else {
            handleSliderDraft(curLo, Math.max(val, curLo));
          }
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const target = activeThumbRef.current;
          if (!target) return;
          const val = valueFromLocationX(e.nativeEvent.locationX);
          const { lo: curLo, hi: curHi } = latestValuesRef.current;
          if (target === "low") {
            handleSliderDraft(Math.min(val, curHi), curHi);
          } else {
            handleSliderDraft(curLo, Math.max(val, curLo));
          }
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
          onDragStateChange?.(false);
          flushDragCommit();
        },
        onPanResponderTerminate: () => {
          activeThumbRef.current = null;
          onDragStateChange?.(false);
          flushDragCommit();
        },
      }),
    [onDragStateChange, valueFromLocationX, handleSliderDraft, flushDragCommit],
  );

  // Input handlers.
  const startEdit = (field: "min" | "max") => {
    clearPendingDebounce();
    setEditingField(field);
    if (field === "min") {
      setEditText(lo <= minBound ? "" : String(lo));
    } else if (hasAboveCeilingMax && maxRentUsd != null) {
      setEditText(String(maxRentUsd));
    } else {
      setEditText(hi >= ceiling ? "" : String(hi));
    }
  };

  const applyTypedValue = (
    field: "min" | "max",
    raw: string,
    mode: "live" | "commit",
  ) => {
    const cleaned = raw.replace(/[^\d]/g, "");
    if (field === "min") {
      if (!cleaned) {
        const currentMax =
          hasAboveCeilingMax && maxRentUsd != null ? maxRentUsd : hi;
        if (mode === "live") {
          setDraftSynced({ lo: minBound, hi });
          onChange?.(null, currentMax >= ceiling && !hasAboveCeilingMax ? null : currentMax);
        } else {
          setDraftSynced(null);
          onChange?.(null, currentMax >= ceiling && !hasAboveCeilingMax ? null : currentMax);
          onCommit?.(null, currentMax >= ceiling && !hasAboveCeilingMax ? null : currentMax);
        }
        return;
      }
      const parsed = Number.parseInt(cleaned, 10);
      if (!Number.isFinite(parsed)) return;
      const effectiveHi =
        hasAboveCeilingMax && maxRentUsd != null ? maxRentUsd : hi;
      const clampedMin = Math.max(minBound, parsed);
      const nextHi = Math.max(effectiveHi, clampedMin);
      const sliderLo = Math.min(ceiling, clampedMin);
      const sliderHi = Math.min(ceiling, nextHi);
      const outMin = clampedMin <= minBound ? null : clampedMin;
      const outMax =
        nextHi >= ceiling && !(hasAboveCeilingMax && nextHi > ceiling)
          ? null
          : nextHi;
      if (mode === "live") {
        setDraftSynced({ lo: sliderLo, hi: sliderHi });
        onChange?.(outMin, outMax);
      } else {
        setDraftSynced(null);
        onChange?.(outMin, outMax);
        onCommit?.(outMin, outMax);
      }
      return;
    }

    // field === "max"
    if (!cleaned) {
      if (mode === "live") {
        setDraftSynced({ lo, hi: ceiling });
        onChange?.(lo <= minBound ? null : lo, null);
      } else {
        setDraftSynced(null);
        onChange?.(lo <= minBound ? null : lo, null);
        onCommit?.(lo <= minBound ? null : lo, null);
      }
      return;
    }
    const parsed = Number.parseInt(cleaned, 10);
    if (!Number.isFinite(parsed)) return;
    if (mode === "live") {
      // Allow typing multi-digit numbers (e.g. typing "6" on the way to "600")
      // without clamping min down prematurely.
      if (parsed >= lo) {
        const outMin = lo <= minBound ? null : lo;
        const outMax = parsed === ceiling ? null : parsed;
        setDraftSynced({ lo, hi: Math.min(ceiling, parsed) });
        onChange?.(outMin, outMax);
      }
      return;
    }
    const clampedMax = Math.max(minBound, parsed);
    const nextLo = Math.min(lo, clampedMax);
    const outMin = nextLo <= minBound ? null : nextLo;
    const outMax = clampedMax === ceiling ? null : clampedMax;
    setDraftSynced(null);
    onChange?.(outMin, outMax);
    onCommit?.(outMin, outMax);
  };

  const handleTextChange = (field: "min" | "max", raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    setEditText(digits);
    applyTypedValue(field, digits, "live");
    if (onCommit) {
      clearPendingDebounce();
      debounceTimer.current = setTimeout(() => {
        applyTypedValue(field, digits, "commit");
      }, 350);
    }
  };

  const finishEdit = (field: "min" | "max") => {
    clearPendingDebounce();
    applyTypedValue(field, editText, "commit");
    setEditingField(null);
  };

  // Visual percentages.
  const leftPct = sliderPercent(lo, minBound, ceiling);
  const rightPct = sliderPercent(hi, minBound, ceiling);
  const fillWidthPct = Math.max(0, rightPct - leftPct);

  const inRangeCount = useMemo(() => {
    if (!showHistogram) return null;
    return countListingsInRange(histogram, lo, hi);
  }, [showHistogram, histogram, lo, hi]);

  const hoveredBucket =
    showHistogram && hoveredIndex != null
      ? histogram.buckets[hoveredIndex] ?? null
      : null;

  const metaCenterText = useMemo(() => {
    if (!showHistogram) return null;
    if (hoveredBucket && hoveredIndex != null) {
      return formatBucketLabel(
        hoveredBucket,
        hoveredIndex === histogram.buckets.length - 1,
      );
    }
    if (inRangeCount != null) {
      return `${inRangeCount} ${inRangeCount === 1 ? "unit" : "units"}`;
    }
    return null;
  }, [showHistogram, hoveredBucket, hoveredIndex, histogram, inRangeCount]);

  const minDisplayValue =
    editingField === "min" ? editText : String(Math.round(lo));
  const maxDisplayValue =
    editingField === "max"
      ? editText
      : hasAboveCeilingMax && maxRentUsd != null
        ? String(Math.round(maxRentUsd))
        : hi >= ceiling
          ? `${Math.round(ceiling)}+`
          : String(Math.round(hi));

  const webRangeStyle = (layer: "low" | "high"): Record<string, string | number> => {
    const mid = (lo + hi) / 2 / Math.max(1, ceiling - minBound);
    const pad = Math.round(thumbSize + 2);
    const clip =
      layer === "low"
        ? `inset(-12px calc(${(1 - mid) * 100}% - ${pad}px) -12px -12px)`
        : `inset(-12px -12px -12px calc(${mid * 100}% - ${pad}px))`;
    const close = hi - lo <= step * 6;
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      width: "100%",
      height: Math.round(thumbSize + 10),
      margin: 0,
      background: "transparent",
      pointerEvents: "none",
      zIndex: layer === "low" ? (close ? 4 : 2) : 3,
      clipPath: clip,
      WebkitClipPath: clip,
      accentColor: Studently.color.primary,
      WebkitAppearance: "none",
      appearance: "none",
    };
  };

  const trackHeight = Math.round(thumbSize + 10);
  // Position histogram flush above the 4px rail (overlapping the empty top half of sliderTrack).
  const histogramBottomPull = Math.max(0, Math.round((trackHeight - railHeight) / 2) - 2);

  return (
    <View style={styles.root}>
      <View style={styles.metaRow}>
        <LText variant="caption" style={styles.capLabel}>
          Minimum
        </LText>
        {metaCenterText ? (
          <LText
            variant="caption"
            numberOfLines={1}
            style={[
              styles.metaReadout,
              hoveredBucket && styles.metaReadoutHovered,
            ]}
            testID="budget-histogram-readout"
          >
            {metaCenterText}
          </LText>
        ) : null}
        <LText variant="caption" style={styles.capLabel}>
          Maximum
        </LText>
      </View>

      <View style={styles.chartAndSlider}>
        {showHistogram ? (
          <View
            testID="budget-histogram"
            style={[
              styles.histogram,
              {
                height: barAreaHeight,
                marginHorizontal: thumbRadius,
                marginBottom: -histogramBottomPull,
              },
            ]}
            {...(isWeb
              ? ({
                  onPointerLeave: () => setHoveredIndex(null),
                } as Record<string, unknown>)
              : null)}
          >
            {histogram.buckets.map((bucket, idx) => {
              const isLast = idx === histogram.buckets.length - 1;
              const inRange = isBucketInRange(bucket, lo, hi, ceiling, isLast);
              const isHovered = hoveredIndex === idx;
              const barHeight =
                bucket.count <= 0
                  ? 0
                  : Math.max(
                      designSize(3),
                      Math.round(
                        (bucket.count / histogram.maxBucketCount) * barAreaHeight,
                      ),
                    );
              const barAttrProps = isWeb
                ? ({
                    testID: "budget-histogram-bar",
                    dataSet: {
                      inRange: inRange ? "true" : "false",
                      count: String(bucket.count),
                    },
                  } as Record<string, unknown>)
                : { testID: `budget-histogram-bar-${idx}` };

              return (
                <View
                  key={`${bucket.minUsd}-${bucket.maxUsd}`}
                  style={styles.barSlot}
                  {...(isWeb
                    ? ({
                        onPointerEnter: () => setHoveredIndex(idx),
                      } as Record<string, unknown>)
                    : null)}
                >
                  <View
                    {...barAttrProps}
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: inRange
                          ? Studently.color.primary
                          : isHovered
                            ? "#CBD5E1"
                            : "#DCE1E8",
                        opacity: inRange ? (isHovered ? 1 : 0.78) : 1,
                      },
                      isWeb && !reducedMotion
                        ? ({
                            transitionProperty: "background-color, opacity, height",
                            transitionDuration: "140ms",
                            transitionTimingFunction: "ease",
                          } as unknown as Record<string, unknown>)
                        : null,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        ) : null}

        {isWeb ? (
          <View style={[styles.sliderTrack, { height: trackHeight }]}>
            {createElement("style", {
              dangerouslySetInnerHTML: {
                __html: `
                  input[data-studently-range-scope="${sliderScope}"]::-webkit-slider-runnable-track {
                    background: transparent;
                    height: ${railHeight}px;
                  }
                  input[data-studently-range-scope="${sliderScope}"]::-moz-range-track {
                    background: transparent;
                    height: ${railHeight}px;
                    border: none;
                  }
                  input[data-studently-range-scope="${sliderScope}"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: ${thumbSize}px;
                    height: ${thumbSize}px;
                    margin-top: ${Math.round((railHeight - thumbSize) / 2)}px;
                    border-radius: 50%;
                    background: ${Studently.color.primary};
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 4px rgba(18, 24, 38, 0.28);
                    cursor: pointer;
                    pointer-events: auto;
                  }
                  input[data-studently-range-scope="${sliderScope}"]::-moz-range-thumb {
                    width: ${thumbSize}px;
                    height: ${thumbSize}px;
                    border-radius: 50%;
                    background: ${Studently.color.primary};
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 4px rgba(18, 24, 38, 0.28);
                    cursor: pointer;
                    pointer-events: auto;
                  }
                `,
              },
            })}
            <View
              style={[
                styles.railInset,
                { marginHorizontal: thumbRadius, height: railHeight },
              ]}
            >
              <View style={[styles.sliderRail, { height: railHeight }]} />
              <View
                style={[
                  styles.sliderFill,
                  {
                    height: railHeight,
                    left: `${leftPct}%`,
                    width: `${fillWidthPct}%`,
                  },
                ]}
              />
            </View>
            {createElement("input", {
              ref: lowInputRef,
              type: "range",
              min: minBound,
              max: ceiling,
              step,
              value: lo,
              "data-studently-range": "low",
              "data-studently-range-scope": sliderScope,
              "aria-label": "Minimum budget",
              "aria-valuetext": `$${Math.round(lo)}`,
              onChange: (e: { target: { value: string } }) =>
                handleSliderDraft(Number(e.target.value), hi),
              onPointerUp: flushDragCommit,
              onMouseUp: flushDragCommit,
              onTouchEnd: flushDragCommit,
              onKeyUp: flushDragCommit,
              onBlur: flushDragCommit,
              style: webRangeStyle("low"),
            })}
            {createElement("input", {
              ref: highInputRef,
              type: "range",
              min: minBound,
              max: ceiling,
              step,
              value: hi,
              "data-studently-range": "high",
              "data-studently-range-scope": sliderScope,
              "aria-label": "Maximum budget",
              "aria-valuetext":
                hi >= ceiling ? `$${Math.round(ceiling)}+` : `$${Math.round(hi)}`,
              onChange: (e: { target: { value: string } }) =>
                handleSliderDraft(lo, Number(e.target.value)),
              onPointerUp: flushDragCommit,
              onMouseUp: flushDragCommit,
              onTouchEnd: flushDragCommit,
              onKeyUp: flushDragCommit,
              onBlur: flushDragCommit,
              style: webRangeStyle("high"),
            })}
          </View>
        ) : (
          <View
            style={[styles.sliderTrack, { height: Math.max(trackHeight, 36) }]}
          >
            <View
              onLayout={handleTrackLayout}
              style={[
                styles.nativeTrackArea,
                { marginHorizontal: thumbRadius, height: Math.max(trackHeight, 36) },
              ]}
              {...panResponder.panHandlers}
            >
              <View style={[styles.sliderRail, { height: railHeight }]} />
              <View
                style={[
                  styles.sliderFill,
                  {
                    height: railHeight,
                    left: `${leftPct}%`,
                    width: `${fillWidthPct}%`,
                  },
                ]}
              />
              {nativeTrackWidth > 0 ? (
                <>
                  <View
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel="Minimum budget"
                    accessibilityValue={{
                      min: minBound,
                      max: ceiling,
                      now: Math.round(lo),
                      text: `$${Math.round(lo)}`,
                    }}
                    accessibilityActions={[
                      { name: "increment" },
                      { name: "decrement" },
                    ]}
                    onAccessibilityAction={(ev) => {
                      const delta =
                        ev.nativeEvent.actionName === "increment" ? step : -step;
                      const nextLo = Math.max(
                        minBound,
                        Math.min(hi, lo + delta),
                      );
                      handleSliderDraft(nextLo, hi);
                      emitCommit(nextLo, hi);
                    }}
                    pointerEvents="none"
                    style={[
                      styles.nativeThumb,
                      {
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: thumbRadius,
                        left: (leftPct / 100) * nativeTrackWidth - thumbRadius,
                      },
                    ]}
                  />
                  <View
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel="Maximum budget"
                    accessibilityValue={{
                      min: minBound,
                      max: ceiling,
                      now: Math.round(hi),
                      text:
                        hi >= ceiling
                          ? `$${Math.round(ceiling)}+`
                          : `$${Math.round(hi)}`,
                    }}
                    accessibilityActions={[
                      { name: "increment" },
                      { name: "decrement" },
                    ]}
                    onAccessibilityAction={(ev) => {
                      const delta =
                        ev.nativeEvent.actionName === "increment" ? step : -step;
                      const nextHi = Math.max(
                        lo,
                        Math.min(ceiling, hi + delta),
                      );
                      handleSliderDraft(lo, nextHi);
                      emitCommit(lo, nextHi);
                    }}
                    pointerEvents="none"
                    style={[
                      styles.nativeThumb,
                      {
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: thumbRadius,
                        left: (rightPct / 100) * nativeTrackWidth - thumbRadius,
                      },
                    ]}
                  />
                </>
              ) : null}
            </View>
          </View>
        )}
      </View>

      <View style={styles.budgetPills}>
        <View
          style={[
            styles.budgetPill,
            editingField === "min" && styles.budgetPillFocused,
          ]}
        >
          <LText variant="caption" style={styles.budgetDollar}>
            $
          </LText>
          <TextInput
            accessibilityLabel="Minimum monthly rent"
            value={minDisplayValue}
            keyboardType="number-pad"
            onFocus={() => startEdit("min")}
            onChangeText={(raw) => handleTextChange("min", raw)}
            onBlur={() => finishEdit("min")}
            onSubmitEditing={() => finishEdit("min")}
            placeholder="0"
            placeholderTextColor={Studently.color.inkFaint}
            style={styles.budgetInput}
          />
        </View>
        <View
          style={[
            styles.budgetPill,
            editingField === "max" && styles.budgetPillFocused,
          ]}
        >
          <LText variant="caption" style={styles.budgetDollar}>
            $
          </LText>
          <TextInput
            accessibilityLabel="Maximum monthly rent"
            value={maxDisplayValue}
            keyboardType="number-pad"
            onFocus={() => startEdit("max")}
            onChangeText={(raw) => handleTextChange("max", raw)}
            onBlur={() => finishEdit("max")}
            onSubmitEditing={() => finishEdit("max")}
            placeholder={`${Math.round(ceiling)}+`}
            placeholderTextColor={Studently.color.inkFaint}
            style={styles.budgetInput}
          />
        </View>
      </View>

      {error ? (
        <LText variant="caption" tone="danger" style={styles.errorText}>
          {error}
        </LText>
      ) : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: {
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 18,
    gap: 8,
  },
  capLabel: {
    color: Studently.color.inkFaint,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "600",
    flexShrink: 0,
  },
  metaReadout: {
    color: Studently.color.inkMuted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  metaReadoutHovered: {
    color: Studently.color.ink,
  },
  chartAndSlider: {
    position: "relative",
  },
  histogram: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    zIndex: 1,
  },
  barSlot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  sliderTrack: {
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  railInset: {
    position: "relative",
    justifyContent: "center",
  },
  nativeTrackArea: {
    position: "relative",
    justifyContent: "center",
  },
  sliderRail: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 999,
    backgroundColor: "#DCE1E8",
  },
  sliderFill: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: Studently.color.primary,
  },
  nativeThumb: {
    position: "absolute",
    backgroundColor: Studently.color.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#121826",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 3,
  },
  budgetPills: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  budgetPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Studently.color.surface,
  },
  budgetPillFocused: {
    borderColor: Studently.color.primary,
  },
  budgetDollar: {
    color: Studently.color.inkMuted,
    fontWeight: "700",
  },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Studently.color.ink,
    outlineStyle: "none",
    paddingVertical: 0,
  } as Record<string, unknown>,
  errorText: {
    marginTop: -2,
  },
});
