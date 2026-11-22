import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type View as ViewType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { wizardInputStyle } from "./WizardField";
import {
  formatWizardDate,
  isoInRange,
  longWizardDate,
  monthGrid,
  monthHasSelectableDay,
  monthTitle,
  parseIsoDate,
  shiftIsoDate,
  shiftMonth,
  todayIsoDate,
} from "./dateValue";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const BRAND = "#EA3F4A";

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
  /** Inclusive YYYY-MM-DD. Use the start date as minDate so the end date cannot precede it. */
  minDate?: string;
  /** Inclusive YYYY-MM-DD. */
  maxDate?: string;
  invalid?: boolean;
  disabled?: boolean;
  testID?: string;
};

type Anchor = { x: number; y: number; width: number; height: number };

export function DatePicker({
  value,
  onChange,
  accessibilityLabel,
  placeholder = "Choose a date",
  minDate,
  maxDate,
  invalid,
  disabled,
  testID = "wizard-date",
}: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sheet = Platform.OS !== "web" || windowWidth < 768;
  const fieldRef = useRef<ViewType>(null);
  const dayRefs = useRef<Record<string, ViewType | null>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 16, y: 16, width: 280, height: 48 });
  const initial = value && parseIsoDate(value) ? value : todayIsoDate();
  const initialParts = parseIsoDate(initial) ?? parseIsoDate(todayIsoDate())!;
  const [view, setView] = useState({ y: initialParts.y, m: initialParts.m });
  const [cursor, setCursor] = useState(initial);

  function close() {
    setOpen(false);
  }

  function choose(iso: string) {
    if (!isoInRange(iso, minDate, maxDate)) return;
    onChangeRef.current(iso);
    // Close after this click finishes so the same press does not reopen the field underneath.
    setTimeout(() => setOpen(false), 0);
  }

  function focusDay(iso: string) {
    const node = dayRefs.current[iso];
    if (!node) return;
    if (Platform.OS === "web") {
      (node as unknown as { focus?: () => void }).focus?.();
      return;
    }
    const handle = findNodeHandle(node);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }

  function moveCursor(delta: number) {
    const direction = delta < 0 ? -1 : 1;
    let next = shiftIsoDate(cursor, delta);
    for (let step = 0; next && step < 400 && !isoInRange(next, minDate, maxDate); step += 1) {
      next = shiftIsoDate(next, direction);
    }
    if (!next || !isoInRange(next, minDate, maxDate)) return;
    const parts = parseIsoDate(next);
    if (!parts) return;
    setCursor(next);
    setView({ y: parts.y, m: parts.m });
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focusDay(cursor));
    return () => cancelAnimationFrame(frame);
  }, [open, cursor]);

  useEffect(() => {
    if (!open || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
      if (delta) {
        const target = event.target as HTMLElement | null;
        if (target?.dataset.calendarChrome === "true") return;
        event.preventDefault();
        moveCursor(delta);
        return;
      }
      if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        if (target?.dataset.calendarChrome === "true") return;
        const iso = target?.dataset.date || cursor;
        if (!iso) return;
        event.preventDefault();
        choose(iso);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, cursor, minDate, maxDate]);

  function openPicker() {
    if (disabled) return;
    const selected = value && parseIsoDate(value) ? value : todayIsoDate();
    const parts = parseIsoDate(selected) ?? initialParts;
    setCursor(selected);
    setView({ y: parts.y, m: parts.m });
    setOpen(true);
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }

  const shown = value ? formatWizardDate(value) : "";
  const popoverWidth = 340;
  const calendarHeight = 380;
  const left = Math.max(8, Math.min(anchor.x, windowWidth - popoverWidth - 8));
  const below = anchor.y + anchor.height + 8;
  const spaceBelow = windowHeight - below;
  const top = spaceBelow >= calendarHeight || spaceBelow >= anchor.y
    ? below
    : Math.max(8, anchor.y - calendarHeight - 8);
  const previous = shiftMonth(view.y, view.m, -1);
  const next = shiftMonth(view.y, view.m, 1);
  const canPrev = monthHasSelectableDay(previous.y, previous.m, minDate, maxDate);
  const canNext = monthHasSelectableDay(next.y, next.m, minDate, maxDate);
  const today = todayIsoDate();
  const cells = monthGrid(view.y, view.m);

  const calendar = (
    <View accessibilityRole="none" testID={`${testID}-calendar`}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: !canPrev }}
          disabled={!canPrev}
          onPress={() => canPrev && setView(previous)}
          style={[styles.nav, !canPrev && styles.navDisabled]}
          {...chromeProps()}
        >
          <Ionicons name="chevron-back" size={20} color={canPrev ? Lister.color.ink : Lister.color.inkFaint} />
        </Pressable>
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={styles.monthTitle}
        >
          {monthTitle(view.y, view.m)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          onPress={() => canNext && setView(next)}
          style={[styles.nav, !canNext && styles.navDisabled]}
          {...chromeProps()}
        >
          <Ionicons name="chevron-forward" size={20} color={canNext ? Lister.color.ink : Lister.color.inkFaint} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close calendar"
          onPress={close}
          style={styles.nav}
          {...chromeProps()}
        >
          <Ionicons name="close" size={20} color={Lister.color.ink} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekday} accessibilityElementsHidden importantForAccessibility="no">
            {label}
          </Text>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((iso) => {
            const parts = parseIsoDate(iso)!;
            const enabled = isoInRange(iso, minDate, maxDate);
            const selected = iso === value;
            const isToday = iso === today;
            const outside = parts.m !== view.m;
            return (
              <Pressable
                key={iso}
                ref={(node) => {
                  dayRefs.current[iso] = node;
                }}
                accessibilityRole="button"
                accessibilityLabel={isToday ? `${longWizardDate(iso)}, today` : longWizardDate(iso)}
                accessibilityState={{ selected, disabled: !enabled }}
                disabled={!enabled}
                onFocus={() => setCursor(iso)}
                onPress={() => choose(iso)}
                testID={`${testID}-day-${iso}`}
                style={styles.slot}
                {...dayProps(iso)}
              >
                <View
                  style={[
                    styles.day,
                    selected && styles.daySelected,
                    cursor === iso && !selected && styles.dayFocus,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      outside && styles.dayOutside,
                      !enabled && styles.dayDisabled,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {parts.d}
                  </Text>
                  {isToday ? <View style={[styles.todayDot, selected && styles.todayDotOn]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <>
      <Pressable
        ref={fieldRef}
        accessibilityRole="button"
        accessibilityLabel={shown ? `${accessibilityLabel}, ${longWizardDate(value)}` : accessibilityLabel}
        accessibilityHint="Opens a calendar"
        accessibilityState={{ expanded: open, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={openPicker}
        testID={testID}
        style={[wizardInputStyle(invalid), styles.field, disabled && styles.fieldDisabled]}
      >
        <Text style={[styles.fieldText, !shown && styles.placeholder]}>{shown || placeholder}</Text>
        <Ionicons name="calendar-outline" size={20} color={Lister.color.inkMuted} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={close}
        statusBarTranslucent
      >
        {sheet ? (
          <View style={styles.sheetRoot}>
            <Pressable accessibilityLabel="Dismiss calendar" onPress={close} style={styles.backdrop} />
            <View
              accessibilityViewIsModal
              accessibilityRole="none"
              accessibilityLabel={accessibilityLabel}
              testID={`${testID}-sheet`}
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>{accessibilityLabel}</Text>
              {calendar}
            </View>
          </View>
        ) : (
          <View style={styles.popRoot} pointerEvents="box-none">
            <Pressable accessibilityLabel="Dismiss calendar" onPress={close} style={styles.backdrop} />
            <View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              testID={`${testID}-popover`}
              style={[styles.popover, { top, left, width: popoverWidth }]}
            >
              {calendar}
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

function chromeProps() {
  return Platform.OS === "web" ? { dataSet: { calendarChrome: "true" } } : {};
}

function dayProps(iso: string) {
  return Platform.OS === "web" ? { dataSet: { date: iso } } : {};
}

const styles = {
  field: {
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: {
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
  },
  placeholder: { color: Lister.color.inkFaint },
  popRoot: { flex: 1 },
  sheetRoot: { flex: 1, justifyContent: "flex-end" as const },
  backdrop: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(26, 26, 26, 0.28)",
  },
  popover: {
    position: "absolute" as const,
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 16px 40px rgba(26, 26, 26, 0.16)" }
      : { elevation: 8 }),
  },
  sheet: {
    backgroundColor: Lister.color.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Lister.color.border,
    alignSelf: "center" as const,
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    color: Lister.color.ink,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  monthRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 44,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center" as const,
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
    color: Lister.color.ink,
  },
  nav: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 22,
  },
  navDisabled: { opacity: 0.35 },
  weekRow: { flexDirection: "row" as const },
  weekday: {
    flex: 1,
    textAlign: "center" as const,
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 32,
    color: Lister.color.inkMuted,
  },
  slot: {
    flex: 1,
    minHeight: 44,
    minWidth: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  day: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 22,
    position: "relative" as const,
  },
  daySelected: { backgroundColor: BRAND },
  dayFocus: Platform.OS === "web"
    ? { boxShadow: "0 0 0 2px #1A1A1A" }
    : { borderWidth: 2, borderColor: Lister.color.ink },
  dayText: {
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
  },
  dayOutside: { color: Lister.color.inkFaint },
  dayDisabled: { color: Lister.color.inkFaint },
  dayTextSelected: { color: "#FFFFFF", fontFamily: Lister.type.bodySemi },
  todayDot: {
    position: "absolute" as const,
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Lister.color.inkMuted,
  },
  todayDotOn: { backgroundColor: "#FFFFFF" },
};
