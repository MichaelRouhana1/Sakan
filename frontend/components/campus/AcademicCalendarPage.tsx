import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  daysUntil,
  fillsOn,
  holidaysInMonth,
  holidaysOn,
  nextHoliday,
  toIsoDate,
  windowsOn,
  type HolidayStatus,
  type NationalHoliday,
} from "@/constants/lebanonHolidays";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function startOfMonthGrid(year: number, monthIndex: number): Date {
  const first = new Date(year, monthIndex, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  return new Date(year, monthIndex, 1 - mondayIndex);
}

function monthCellCount(year: number, monthIndex: number): number {
  const first = new Date(year, monthIndex, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return Math.ceil((mondayIndex + days) / 7) * 7;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatRange(h: NationalHoliday): string {
  if (h.status === "tentative" && h.start === h.end && h.windowStart && h.windowEnd) {
    return `Around ${parseNice(h.start)} · 1 day, date TBC`;
  }
  if (h.start === h.end) return parseNice(h.start);
  return `${parseNice(h.start)} – ${parseNice(h.end)}`;
}

function parseNice(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function parseIsoSafe(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

function isoInMonth(iso: string, year: number, monthIndex: number): boolean {
  const dt = parseIsoSafe(iso);
  return dt.getFullYear() === year && dt.getMonth() === monthIndex;
}

function addIso(iso: string, days: number): string {
  const dt = parseIsoSafe(iso);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
}

function useProjectors(
  windows: { id: string; dates: string[]; span: number }[],
  enabled: boolean,
): Set<string> {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || windows.length === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 820);
    return () => clearInterval(id);
  }, [enabled, windows]);

  return useMemo(() => {
    const lit = new Set<string>();
    for (const w of windows) {
      if (w.dates.length === 0) continue;
      const span = Math.max(1, Math.min(w.span, w.dates.length));
      const steps = w.dates.length - span + 1;
      const start = tick % steps;
      for (let k = 0; k < span; k++) {
        const iso = w.dates[start + k];
        if (iso) lit.add(iso);
      }
    }
    return lit;
  }, [tick, windows]);
}

function SpotlightWash({ active }: { active: boolean }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withTiming(active ? 1 : 0, {
      duration: active ? 220 : 280,
      easing: Easing.out(Easing.quad),
    });
  }, [active, glow]);
  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.86 + glow.value * 0.14 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.spotlight, style]} />
  );
}

export function AcademicCalendarPage() {
  const { width } = useWindowDimensions();
  const stacked = width < 720;
  const compact = width < 640;
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();
  const monthHolidays = holidaysInMonth(cursor.year, cursor.month);
  const projectorWindows = useMemo(
    () =>
      monthHolidays
        .filter((h) => h.status === "tentative" && h.windowStart && h.windowEnd)
        .map((h) => {
          const dates: string[] = [];
          let cur = h.windowStart!;
          while (cur <= h.windowEnd!) {
            if (isoInMonth(cur, cursor.year, cursor.month)) dates.push(cur);
            cur = addIso(cur, 1);
          }
          const span =
            h.start === h.end
              ? 1
              : Math.round(
                  (parseIsoSafe(h.end).getTime() -
                    parseIsoSafe(h.start).getTime()) /
                    86_400_000,
                ) + 1;
          return { id: h.id, dates, span };
        })
        .filter((w) => w.dates.length > 1),
    [monthHolidays, cursor.year, cursor.month],
  );
  const litDays = useProjectors(projectorWindows, !reduceMotion);
  const monthStart = toIsoDate(new Date(cursor.year, cursor.month, 1));
  const selectedInMonth =
    selected != null && isoInMonth(selected, cursor.year, cursor.month);
  const selectedHits = selectedInMonth && selected ? holidaysOn(selected) : [];
  const countdownFrom =
    selectedInMonth && selected ? selected : monthStart;
  const upcoming = useMemo(
    () => nextHoliday(countdownFrom),
    [countdownFrom],
  );
  const cells = useMemo(() => {
    const start = startOfMonthGrid(cursor.year, cursor.month);
    const count = monthCellCount(cursor.year, cursor.month);
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [cursor.year, cursor.month]);

  const rawDaysToNext = upcoming
    ? daysUntil(upcoming.start, countdownFrom)
    : null;
  const daysToNext =
    rawDaysToNext == null
      ? null
      : rawDaysToNext > 0 && countdownFrom.endsWith("-01")
        ? rawDaysToNext + 1
        : rawDaysToNext;

  return (
    <View style={styles.page}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={[styles.headerCopy, compact && styles.headerCopyCompact]}>
          <LText variant="label" tone="muted">
            National days off · Lebanon
          </LText>
          <LText
            variant="display"
            style={[styles.title, compact && styles.titleCompact]}
          >
            When campuses close
          </LText>
          <LText
            variant="body"
            tone="muted"
            style={[styles.lede, compact && styles.ledeCompact]}
          >
            Official public holidays every university follows. When the exact
            dates are not confirmed, an orange light slides across the possible
            days — only the lit pair (or day) is the holiday.
          </LText>
        </View>
        <View style={[styles.legend, compact && styles.legendCompact]}>
          <LegendDot color={Skoun.color.primary} label="Official holiday" />
          <LegendLine label="Possible day (TBC)" />
          <LegendDot color={Skoun.color.borderStrong} label="Weekend" />
        </View>
      </View>

      <View style={[styles.board, stacked && styles.boardStacked]}>
        <View style={[styles.monthCard, compact && styles.monthCardCompact]}>
          <View style={styles.monthBar}>
            <Pressable
              onPress={() => {
                setSelected(null);
                setCursor(
                  cursor.month === 0
                    ? { year: cursor.year - 1, month: 11 }
                    : { year: cursor.year, month: cursor.month - 1 },
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={styles.monthNav}
            >
              <Ionicons name="chevron-back" size={22} color={Skoun.color.ink} />
            </Pressable>
            <LText variant="subtitle" style={styles.monthTitle}>
              {MONTHS[cursor.month]} {cursor.year}
            </LText>
            <Pressable
              onPress={() => {
                setSelected(null);
                setCursor(
                  cursor.month === 11
                    ? { year: cursor.year + 1, month: 0 }
                    : { year: cursor.year, month: cursor.month + 1 },
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={styles.monthNav}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={Skoun.color.ink}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <LText
                key={w}
                variant="label"
                tone="faint"
                style={styles.weekHead}
              >
                {compact ? w.slice(0, 1) : w}
              </LText>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, index) => {
              const iso = toIsoDate(date);
              const inMonth = date.getMonth() === cursor.month;
              const fillHits = inMonth ? fillsOn(iso) : [];
              const windowHits = inMonth ? windowsOn(iso) : [];
              const confirmed = fillHits.some((h) => h.status === "confirmed");
              const onWindow = windowHits.length > 0;
              const prevIso = addIso(iso, -1);
              const nextIso = addIso(iso, 1);
              const col = index % 7;
              const windowStart =
                onWindow && (col === 0 || windowsOn(prevIso).length === 0);
              const windowEnd =
                onWindow && (col === 6 || windowsOn(nextIso).length === 0);
              const isToday = iso === today;
              const isSel = inMonth && selected === iso;
              const weekend = inMonth && isWeekend(date);
              const spotlight = onWindow && litDays.has(iso);
              return (
                <Pressable
                  key={iso}
                  onPress={() => {
                    if (!inMonth) return;
                    setSelected((cur) => (cur === iso ? null : iso));
                  }}
                  disabled={!inMonth}
                  accessibilityRole="button"
                  accessibilityLabel={iso}
                  style={[
                    styles.day,
                    confirmed && styles.dayConfirmed,
                    weekend && !confirmed && !spotlight && styles.dayWeekend,
                    isSel && styles.daySelected,
                  ]}
                >
                  {onWindow ? <SpotlightWash active={spotlight} /> : null}
                  <LText
                    variant="caption"
                    style={[
                      styles.dayNum,
                      !inMonth && styles.dayMuted,
                      confirmed && styles.dayNumConfirmed,
                      spotlight && styles.dayNumTentative,
                      isToday && inMonth && styles.dayToday,
                    ]}
                  >
                    {inMonth ? date.getDate() : ""}
                  </LText>
                  {onWindow ? (
                    <View
                      style={[
                        styles.windowBar,
                        styles.windowBow,
                        windowStart && styles.windowBarStart,
                        windowEnd && styles.windowBarEnd,
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.side}>
          {upcoming ? (
            <View style={styles.nextCard}>
              <LText variant="label" tone="primary">
                Next day off
              </LText>
              <LText variant="subtitle">{upcoming.title}</LText>
              <LText variant="body" tone="muted">
                {formatRange(upcoming)}
                {daysToNext == null
                  ? ""
                  : daysToNext === 0
                    ? " · today"
                    : daysToNext === 1
                      ? " · tomorrow"
                      : daysToNext > 1
                        ? ` · in ${daysToNext} days`
                        : " · this week"}
              </LText>
              <StatusChip status={upcoming.status} />
            </View>
          ) : null}

          <View style={styles.detail}>
            <LText variant="label" tone="muted">
              {selectedInMonth && selected
                ? parseNice(selected)
                : "Pick a day"}
            </LText>
            {!selectedInMonth ? (
              <LText variant="body" tone="muted">
                Tap a date to see why campuses close.
              </LText>
            ) : selectedHits.length === 0 ? (
              <LText variant="body" tone="muted">
                {selected && isWeekend(parseIsoSafe(selected))
                  ? "Weekend — most private universities are closed."
                  : "Regular class day (no national holiday)."}
              </LText>
            ) : (
              selectedHits.map((h) => (
                <View key={h.id} style={styles.event}>
                  <View style={styles.eventHead}>
                    <LText variant="subtitle">{h.title}</LText>
                    <StatusChip status={h.status} />
                  </View>
                  <LText variant="caption" tone="muted">
                    {h.detail}
                  </LText>
                </View>
              ))
            )}
          </View>

          <View style={styles.list}>
            <LText variant="label" tone="muted">
              {MONTHS[cursor.month]} days off
            </LText>
            {monthHolidays.length === 0 ? (
              <LText variant="body" tone="muted">
                No national holidays this month.
              </LText>
            ) : (
              monthHolidays.map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => setSelected(h.start)}
                  style={styles.listRow}
                >
                  <View
                    style={[
                      styles.listMark,
                      h.status === "tentative"
                        ? styles.listMarkTentative
                        : styles.listMarkConfirmed,
                    ]}
                  />
                  <View style={styles.listCopy}>
                    <LText variant="body">{h.title}</LText>
                    <LText variant="caption" tone="muted">
                      {formatRange(h)} · {h.detail}
                    </LText>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <LText variant="caption" tone="faint">
            Fixed dates: Council of Ministers. The orange light slides across
            possible days until the government confirms them.
          </LText>
        </View>
      </View>
    </View>
  );
}

function StatusChip({ status }: { status: HolidayStatus }) {
  const tentative = status === "tentative";
  return (
    <View style={[styles.chip, tentative && styles.chipTentative]}>
      <LText
        variant="label"
        style={tentative ? styles.chipTextTentative : styles.chipText}
      >
        {tentative ? "To be confirmed" : "Official"}
      </LText>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <LText variant="caption" tone="muted">
        {label}
      </LText>
    </View>
  );
}

function LegendLine({ label }: { label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={styles.legendLine} />
      <LText variant="caption" tone="muted">
        {label}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 16,
    width: "100%",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  headerCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  headerCopy: {
    gap: 6,
    flex: 1,
    minWidth: 280,
  },
  headerCopyCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    minWidth: 0,
    width: "100%",
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
  },
  ledeCompact: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: "100%",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingBottom: 4,
  },
  legendCompact: {
    gap: 10,
    paddingBottom: 0,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: Skoun.color.warning,
  },
  board: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
    flexGrow: 1,
  },
  boardStacked: {
    flexDirection: "column",
  },
  monthCard: {
    flex: 1.45,
    minWidth: 0,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    padding: 20,
    gap: 12,
  },
  monthCardCompact: {
    padding: 12,
    gap: 8,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: {
    fontSize: 20,
  },
  monthNav: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    cursor: "pointer",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekHead: {
    flex: 1,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  day: {
    width: "14.285%",
    aspectRatio: 1,
    maxHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    position: "relative",
  },
  dayConfirmed: {
    backgroundColor: Skoun.color.primaryMist,
  },
  dayTentative: {
    backgroundColor: Skoun.color.warningSoft,
  },
  dayWeekend: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  daySelected: {
    borderWidth: 2,
    borderColor: Skoun.color.primary,
  },
  dayNum: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  dayMuted: {
    color: Skoun.color.inkFaint,
  },
  dayNumConfirmed: {
    color: Skoun.color.primary,
  },
  dayNumTentative: {
    color: Skoun.color.warning,
  },
  dayToday: {
    textDecorationLine: "underline",
  },
  spotlight: {
    position: "absolute",
    top: 6,
    right: 6,
    bottom: 10,
    left: 6,
    borderRadius: 10,
    backgroundColor: "rgba(180, 83, 9, 0.22)",
    borderWidth: 1.5,
    borderColor: Skoun.color.warning,
  },
  windowBar: {
    position: "absolute",
    bottom: 8,
    left: 2,
    right: 2,
    height: 3,
    backgroundColor: Skoun.color.warning,
  },
  windowBow: {
    height: 4,
    opacity: 0.55,
    borderRadius: 4,
  },
  windowBarStart: {
    left: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  windowBarEnd: {
    right: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  side: {
    flex: 1,
    minWidth: 260,
    maxWidth: 420,
    gap: 14,
  },
  nextCard: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    padding: 20,
    gap: 6,
  },
  detail: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    padding: 20,
    gap: 8,
  },
  event: {
    gap: 4,
  },
  eventHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  list: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    padding: 20,
    gap: 10,
    flexGrow: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
    cursor: "pointer",
  },
  listMark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginTop: 7,
  },
  listMarkConfirmed: {
    backgroundColor: Skoun.color.primary,
  },
  listMarkTentative: {
    backgroundColor: Skoun.color.warning,
  },
  listCopy: {
    flex: 1,
    gap: 2,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTentative: {
    backgroundColor: Skoun.color.warningSoft,
  },
  chipText: {
    color: Skoun.color.primary,
  },
  chipTextTentative: {
    color: Skoun.color.warning,
  },
});
