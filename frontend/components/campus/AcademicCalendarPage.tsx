import { Ionicons } from "@expo/vector-icons";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { useMemo, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  LEBANON_HOLIDAYS,
  daysUntil,
  fillsOn,
  holidayEnd,
  holidaysInMonth,
  holidaysOn,
  nextHolidayAfter,
  toIsoDate,
  windowsOn,
  type HolidayStatus,
  type NationalHoliday,
} from "@/constants/lebanonHolidays";
import { Skoun } from "@/constants/theme";

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
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const YEAR_MIN = 2026;
const YEAR_MAX = 2027;

const C = {
  ink: Skoun.color.ink,
  muted: Skoun.color.inkMuted,
  faint: Skoun.color.inkFaint,
  primary: Skoun.color.primary,
  mist: Skoun.color.primaryMist,
  soft: Skoun.color.primarySoft,
  surface: Skoun.color.surface,
  border: "#D5DCE7",
  hair: "#E8EDF4",
  holiday: Skoun.color.danger,
  holidaySoft: Skoun.color.dangerSoft,
  tbc: "#3D4F73",
  tbcSoft: "#E4EAF3",
  weekend: "#EEF2F7",
  inverse: "#FFFFFF",
} as const;

const Type = {
  display: Skoun.type.display,
  displaySemi: Skoun.type.displayMedium,
  sans: Skoun.type.body,
  sansMed: Skoun.type.bodyMedium,
  sansSemi: Skoun.type.bodySemi,
  sansBold: Skoun.type.bodyBold,
} as const;

const web = Platform.OS === "web";

function webProps(className: string) {
  return web ? ({ className } as object) : null;
}

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
    return `Around ${parseNice(h.start)} · date TBC`;
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

function holidayMark(h: NationalHoliday): "official" | "tbc" {
  return h.status === "tentative" ? "tbc" : "official";
}

function upcomingHolidays(fromIso: string, limit: number): NationalHoliday[] {
  const rows: NationalHoliday[] = [];
  for (const h of LEBANON_HOLIDAYS) {
    if (holidayEnd(h) < fromIso) continue;
    rows.push(h);
    if (rows.length >= limit) break;
  }
  return rows;
}

function awayLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days} days`;
}

function Ink({
  children,
  style,
  numberOfLines,
  accessibilityRole,
}: {
  children: ReactNode;
  style?: object | object[];
  numberOfLines?: number;
  accessibilityRole?: "header" | "text";
}) {
  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </Text>
  );
}

export function AcademicCalendarPage() {
  useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const compact = width < 640;
  const showDayNames = width >= 900;
  const today = useMemo(() => toIsoDate(new Date()), []);
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    const year = Math.min(YEAR_MAX, Math.max(YEAR_MIN, n.getFullYear()));
    return { year, month: n.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(() => {
    const n = new Date();
    const year = Math.min(YEAR_MAX, Math.max(YEAR_MIN, n.getFullYear()));
    return year === n.getFullYear() ? toIsoDate(n) : null;
  });

  const monthHolidays = holidaysInMonth(cursor.year, cursor.month);
  const selectedInMonth =
    selected != null && isoInMonth(selected, cursor.year, cursor.month);
  const selectedHits = selectedInMonth && selected ? holidaysOn(selected) : [];
  const viewingTodayMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const deskIso =
    selectedInMonth && selected
      ? selected
      : viewingTodayMonth
        ? today
        : null;
  const countdownFrom = selected ?? today;
  const upcoming = useMemo(
    () => nextHolidayAfter(countdownFrom),
    [countdownFrom],
  );
  const comingUp = useMemo(() => {
    const monthIds = new Set(monthHolidays.map((h) => h.id));
    return upcomingHolidays(today, 8).filter((h) => !monthIds.has(h.id));
  }, [today, monthHolidays]);
  const cells = useMemo(() => {
    const start = startOfMonthGrid(cursor.year, cursor.month);
    const count = monthCellCount(cursor.year, cursor.month);
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [cursor.year, cursor.month]);

  const monthMarks = useMemo(
    () =>
      MONTHS.map((_, month) => ({
        month,
        count: holidaysInMonth(cursor.year, month).length,
        hasTbc: holidaysInMonth(cursor.year, month).some(
          (h) => h.status === "tentative",
        ),
      })),
    [cursor.year],
  );
  const heatMax = Math.max(1, ...monthMarks.map((row) => row.count));
  const yearCloses = monthMarks.reduce((n, row) => n + row.count, 0);

  const daysToNext = upcoming
    ? daysUntil(upcoming.start, countdownFrom)
    : null;

  const atStart = cursor.year === YEAR_MIN && cursor.month === 0;
  const atEnd = cursor.year === YEAR_MAX && cursor.month === 11;

  const shiftMonth = (delta: number) => {
    setSelected(null);
    const date = new Date(cursor.year, cursor.month + delta, 1);
    const year = date.getFullYear();
    if (year < YEAR_MIN || year > YEAR_MAX) return;
    setCursor({ year, month: date.getMonth() });
  };

  const goToIso = (iso: string) => {
    const dt = parseIsoSafe(iso);
    const year = Math.min(YEAR_MAX, Math.max(YEAR_MIN, dt.getFullYear()));
    setCursor({ year, month: dt.getMonth() });
    setSelected(iso);
  };

  const goToday = () => {
    const year = Math.min(YEAR_MAX, Math.max(YEAR_MIN, now.getFullYear()));
    setCursor({ year, month: now.getMonth() });
    setSelected(today);
  };

  const selectedDate = deskIso ? parseIsoSafe(deskIso) : null;
  const deskWeekday = selectedDate
    ? selectedDate
        .toLocaleDateString("en-GB", { weekday: "long" })
        .toUpperCase()
    : MONTHS[cursor.month].toUpperCase();
  const deskMonth = selectedDate
    ? selectedDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : String(cursor.year);

  const heat = (fill?: boolean) =>
    monthMarks.map((row) => (
      <HeatMonth
        key={row.month}
        fill={fill}
        label={MONTH_SHORT[row.month]}
        active={row.month === cursor.month}
        count={row.count}
        hasTbc={row.hasTbc}
        heatMax={heatMax}
        isNow={
          cursor.year === now.getFullYear() && row.month === now.getMonth()
        }
        onPress={() => {
          setSelected(null);
          setCursor({ year: cursor.year, month: row.month });
        }}
      />
    ));

  const legend = (
    <View style={styles.legend}>
      <LegendSwatch tone="official" label="Official close" />
      <LegendSwatch tone="tbc" label="Moon window" />
    </View>
  );

  const yearControls = (
    <>
      <View
        style={styles.yearTrack}
        accessibilityRole="tablist"
        accessibilityLabel="Calendar year"
      >
        {[YEAR_MIN, YEAR_MAX].map((year) => {
          const on = cursor.year === year;
          return (
            <Pressable
              key={year}
              onPress={() => {
                setSelected(null);
                setCursor({ year, month: cursor.month });
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${year}`}
              style={({ pressed, hovered }: PressState) => [
                styles.yearChip,
                on && styles.yearChipOn,
                (hovered || pressed) && !on && styles.yearChipHover,
              ]}
              {...webProps("campus-cal-chip")}
            >
              <Ink
                style={[styles.yearChipText, on && styles.yearChipTextOn]}
              >
                {year}
              </Ink>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={goToday}
        accessibilityRole="button"
        accessibilityLabel="Jump to today"
        style={({ pressed, hovered }: PressState) => [
          styles.todayBtn,
          viewingTodayMonth && styles.todayBtnOn,
          (hovered || pressed) && !viewingTodayMonth && styles.todayBtnHover,
        ]}
        {...webProps("campus-cal-chip")}
      >
        <Ionicons
          name="locate-outline"
          size={15}
          color={viewingTodayMonth ? C.inverse : C.primary}
        />
        <Ink
          style={[
            styles.todayBtnText,
            viewingTodayMonth && styles.todayBtnTextOn,
          ]}
        >
          Today
        </Ink>
      </Pressable>
    </>
  );

  return (
    <View style={styles.page}>
      <View
        style={[styles.heroRow, stacked && styles.heroRowCompact]}
        {...webProps("campus-cal-hero")}
      >
        <View style={styles.hero}>
          <View style={styles.heroRule} />
          <Ink style={styles.kicker}>
            Academic calendar · {yearCloses} national closes in {cursor.year}
          </Ink>
          <Ink
            accessibilityRole="header"
            style={[styles.title, compact && styles.titleCompact]}
          >
            When campuses{" "}
            <Text style={styles.titleAccent}>close</Text>
          </Ink>
        </View>

        {upcoming && daysToNext != null ? (
          <Pressable
            onPress={() => goToIso(upcoming.start)}
            accessibilityRole="button"
            accessibilityLabel={`Next close: ${upcoming.title}, ${awayLabel(daysToNext)}`}
            style={({ pressed, hovered }: PressState) => [
              styles.metric,
              stacked && styles.metricStacked,
              (hovered || pressed) && styles.metricHover,
            ]}
            {...webProps("campus-cal-ticket")}
          >
            <Ink style={[styles.metricNum, compact && styles.metricNumCompact]}>
              {daysToNext}
            </Ink>
            <View style={styles.metricCopy}>
              <Ink style={styles.metricUnit}>
                {daysToNext === 1 ? "day" : "days"} to {upcoming.title}
              </Ink>
              <Ink style={styles.metricRange}>{formatRange(upcoming)}</Ink>
            </View>
            <Ionicons name="arrow-forward" size={16} color={C.inverse} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[styles.board, compact && styles.boardCompact]}
        {...webProps("campus-cal-board")}
      >
        <LinearGradient
          colors={["#F4F8FF", "#FFFFFF", "#F7F9FC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.boardFill, compact && styles.boardFillCompact]}
        >
          <View pointerEvents="none" style={styles.boardOrb} />

          {stacked ? (
            <View style={styles.toolbar}>{legend}</View>
          ) : null}

          {!stacked ? null : compact ? (
            <View style={styles.heatWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.heatScroll}
              >
                {heat(false)}
              </ScrollView>
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(244,248,255,0)", "#F7F9FC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heatFade}
              />
            </View>
          ) : (
            <View
              style={styles.heatRail}
              accessibilityRole="tablist"
              accessibilityLabel="Closes by month"
            >
              {heat(true)}
            </View>
          )}

          <View
            style={[styles.split, stacked && styles.splitStacked]}
            {...webProps("campus-cal-split")}
          >
            <View style={styles.plateCol}>
            {!stacked ? (
              <View
                style={styles.heatRail}
                accessibilityRole="tablist"
                accessibilityLabel="Closes by month"
              >
                {heat(true)}
              </View>
            ) : null}
            <View
              style={[styles.plate, compact && styles.plateCompact]}
              {...webProps("campus-cal-month-swap")}
              key={`${cursor.year}-${cursor.month}`}
            >
              <View style={styles.monthHead}>
                <View style={styles.monthHeadCopy}>
                  <Ink
                    style={[
                      styles.monthName,
                      compact && styles.monthNameCompact,
                    ]}
                  >
                    {MONTHS[cursor.month]}
                  </Ink>
                  <Ink style={styles.monthYear}>{cursor.year}</Ink>
                  {monthHolidays.length > 0 ? (
                    <View style={styles.monthBadge}>
                      <Ink style={styles.monthBadgeText}>
                        {monthHolidays.length} close
                        {monthHolidays.length === 1 ? "" : "s"}
                      </Ink>
                    </View>
                  ) : (
                    <Ink style={styles.monthQuiet}>Quiet month</Ink>
                  )}
                </View>
                <View style={styles.monthNavGroup}>
                  {!stacked ? legend : null}
                  {!stacked ? <View style={styles.monthNavDivider} /> : null}
                  {yearControls}
                  <View style={styles.monthNavDivider} />
                  <Pressable
                    onPress={() => shiftMonth(-1)}
                    disabled={atStart}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    accessibilityState={{ disabled: atStart }}
                    style={({ pressed, hovered }: PressState) => [
                      styles.monthNav,
                      atStart && styles.monthNavDisabled,
                      (hovered || pressed) && !atStart && styles.monthNavHover,
                    ]}
                    {...webProps("campus-cal-chip")}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={atStart ? C.faint : C.ink}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => shiftMonth(1)}
                    disabled={atEnd}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    accessibilityState={{ disabled: atEnd }}
                    style={({ pressed, hovered }: PressState) => [
                      styles.monthNav,
                      atEnd && styles.monthNavDisabled,
                      (hovered || pressed) && !atEnd && styles.monthNavHover,
                    ]}
                    {...webProps("campus-cal-chip")}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={atEnd ? C.faint : C.ink}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.calFrame}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => (
                  <Ink
                    key={w}
                    style={[
                      styles.weekHead,
                      (i === 5 || i === 6) && styles.weekHeadWeekend,
                    ]}
                  >
                    {compact ? w.slice(0, 1) : w}
                  </Ink>
                ))}
              </View>

              <View style={styles.grid} accessibilityRole="grid">
                {cells.map((date, index) => {
                  const iso = toIsoDate(date);
                  const inMonth = date.getMonth() === cursor.month;
                  const fillHits = inMonth ? fillsOn(iso) : [];
                  const windowHits = inMonth ? windowsOn(iso) : [];
                  const confirmed = fillHits.some(
                    (h) => h.status === "confirmed",
                  );
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
                  const markTitle =
                    fillHits[0]?.title ?? windowHits[0]?.title ?? null;
                  const labelBits = [
                    date.toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  ];
                  if (isToday) labelBits.push("today");
                  if (markTitle) labelBits.push(markTitle);
                  if (onWindow) labelBits.push("possible holiday window");
                  if (isSel) labelBits.push("selected");

                  return (
                    <Pressable
                      key={iso}
                      onPress={() => {
                        if (!inMonth) return;
                        setSelected((cur) => (cur === iso ? null : iso));
                      }}
                      disabled={!inMonth}
                      accessibilityRole="button"
                      accessibilityLabel={labelBits.join(", ")}
                      accessibilityState={{
                        selected: isSel,
                        disabled: !inMonth,
                      }}
                      style={({ pressed, hovered }: PressState) => [
                        styles.day,
                        compact && styles.dayCompact,
                        stacked && !compact && styles.dayStacked,
                        col === 6 && styles.dayLastCol,
                        index >= cells.length - 7 && styles.dayLastRow,
                        weekend && !confirmed && !isSel && styles.dayWeekend,
                        confirmed && !isSel && styles.dayConfirmed,
                        isSel && styles.daySelected,
                        isToday && inMonth && !isSel && styles.dayToday,
                        inMonth &&
                          (hovered || pressed) &&
                          !isSel &&
                          styles.dayHover,
                        !inMonth && styles.dayOutside,
                      ]}
                      {...webProps("campus-cal-day")}
                    >
                      <View style={styles.dayTop}>
                        <Ink
                          style={[
                            styles.dayNum,
                            compact && styles.dayNumCompact,
                            !inMonth && styles.dayMuted,
                            confirmed && !isSel && styles.dayNumConfirmed,
                            onWindow && !isSel && styles.dayNumTentative,
                            isSel && styles.dayNumSelected,
                            isToday && inMonth && !isSel && styles.dayNumToday,
                          ]}
                        >
                          {date.getDate()}
                        </Ink>
                        {inMonth && isToday ? (
                          <Ink
                            style={[
                              styles.todayTag,
                              isSel && styles.todayTagOn,
                            ]}
                          >
                            Today
                          </Ink>
                        ) : null}
                      </View>
                      {showDayNames && inMonth && markTitle ? (
                        <Ink
                          style={[
                            styles.dayName,
                            isSel && styles.dayNameSelected,
                          ]}
                          numberOfLines={2}
                        >
                          {markTitle}
                        </Ink>
                      ) : null}
                      {onWindow ? (
                        <View
                          style={[
                            styles.windowBar,
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
            </View>
            </View>

            <View
              style={[styles.desk, stacked && styles.deskStacked]}
              {...webProps("campus-cal-ledger")}
            >
              <View style={styles.deskCap}>
                <Ink style={styles.deskWeekday}>{deskWeekday}</Ink>
                <Ink
                  style={[styles.deskDay, compact && styles.deskDayCompact]}
                >
                  {selectedDate ? selectedDate.getDate() : MONTH_SHORT[cursor.month]}
                </Ink>
                <Ink style={styles.deskMonth}>{deskMonth}</Ink>
              </View>

              <View style={styles.deskBody}>
                {!selectedInMonth ? (
                  <Ink style={styles.detailBody}>
                    Tap a date on the grid. Upcoming national closes stay
                    listed below.
                  </Ink>
                ) : selectedHits.length === 0 ? (
                  <Ink style={styles.detailBody}>
                    {selectedDate && isWeekend(selectedDate)
                      ? "Weekend — most private universities are closed."
                      : "Regular class day. No national holiday."}
                  </Ink>
                ) : (
                  selectedHits.map((h) => (
                    <View key={h.id} style={styles.event}>
                      <View style={styles.eventHead}>
                        <Ink style={styles.eventTitle}>{h.title}</Ink>
                        <StatusChip status={h.status} />
                      </View>
                      <Ink style={styles.eventDetail}>{h.detail}</Ink>
                    </View>
                  ))
                )}

                {monthHolidays.length > 0 ? (
                  <View style={styles.block}>
                    <Ink style={styles.blockKicker}>
                      In {MONTHS[cursor.month]}
                    </Ink>
                    {monthHolidays.map((h) => (
                      <ComingRow
                        key={h.id}
                        holiday={h}
                        fromIso={today}
                        active={selected === h.start}
                        onPress={() => goToIso(h.start)}
                      />
                    ))}
                  </View>
                ) : null}

                <View style={styles.block}>
                  <Ink style={styles.blockKicker}>Coming up</Ink>
                  {comingUp.length === 0 ? (
                    <Ink style={styles.detailBody}>
                      No further national holidays in this calendar.
                    </Ink>
                  ) : (
                    comingUp.slice(0, 5).map((h) => (
                      <ComingRow
                        key={h.id}
                        holiday={h}
                        fromIso={today}
                        active={selected === h.start}
                        onPress={() => goToIso(h.start)}
                      />
                    ))
                  )}
                </View>

                <Ink style={styles.colophon}>
                  Fixed dates: Council of Ministers. Slate marks a moon-sighting
                  window until the government confirms the day.
                </Ink>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

type PressState = { pressed: boolean; hovered?: boolean };

function HeatMonth({
  label,
  active,
  count,
  hasTbc,
  heatMax,
  isNow,
  fill,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  hasTbc: boolean;
  heatMax: number;
  isNow: boolean;
  fill?: boolean;
  onPress: () => void;
}) {
  const pct = count === 0 ? 0 : Math.max(22, Math.round((count / heatMax) * 100));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${count ? `, ${count} holidays` : ", none"}${isNow ? ", current month" : ""}`}
      style={({ pressed, hovered }: PressState) => [
        styles.heatMonth,
        fill && styles.heatMonthFill,
        active && styles.heatMonthOn,
        (hovered || pressed) && !active && styles.heatMonthHover,
      ]}
      {...webProps("campus-cal-month")}
    >
      <Ink style={[styles.heatLabel, active && styles.heatLabelOn]}>
        {label}
      </Ink>
      <View style={styles.heatTrack}>
        <View
          style={[
            styles.heatFill,
            {
              width: `${pct}%`,
              backgroundColor:
                count === 0 ? "transparent" : hasTbc ? C.tbc : C.holiday,
            },
          ]}
          {...webProps("campus-cal-heat")}
        />
      </View>
      <Ink
        style={[
          styles.heatCount,
          count === 0 && styles.heatCountEmpty,
          hasTbc && count > 0 && styles.heatCountTbc,
          active && styles.heatCountOn,
        ]}
      >
        {count || "–"}
      </Ink>
    </Pressable>
  );
}

function ComingRow({
  holiday,
  fromIso,
  active,
  onPress,
}: {
  holiday: NationalHoliday;
  fromIso: string;
  active: boolean;
  onPress: () => void;
}) {
  const dt = parseIsoSafe(holiday.start);
  const days = daysUntil(holiday.start, fromIso);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${holiday.title}, ${formatRange(holiday)}`}
      style={({ pressed, hovered }: PressState) => [
        styles.comingRow,
        active && styles.comingRowOn,
        (hovered || pressed) && !active && styles.comingRowHover,
      ]}
    >
      <View
        style={[
          styles.comingDate,
          holidayMark(holiday) === "tbc"
            ? styles.comingDateTbc
            : styles.comingDateOfficial,
        ]}
      >
        <Ink style={styles.comingDay}>{dt.getDate()}</Ink>
        <Ink style={styles.comingMon}>{MONTH_SHORT[dt.getMonth()]}</Ink>
      </View>
      <View style={styles.comingCopy}>
        <Ink style={styles.comingTitle} numberOfLines={1}>
          {holiday.title}
        </Ink>
        <Ink style={styles.comingMeta}>
          {holiday.status === "tentative" ? "TBC · " : ""}
          {days < 0 ? formatRange(holiday) : awayLabel(days)}
        </Ink>
      </View>
    </Pressable>
  );
}

function StatusChip({ status }: { status: HolidayStatus }) {
  const tentative = status === "tentative";
  return (
    <View style={[styles.chip, tentative && styles.chipTentative]}>
      <Ink style={[styles.chipText, tentative && styles.chipTextTentative]}>
        {tentative ? "To be confirmed" : "Official"}
      </Ink>
    </View>
  );
}

function LegendSwatch({
  tone,
  label,
}: {
  tone: "official" | "tbc";
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendLine,
          tone === "official" ? styles.legendOfficial : styles.legendTbc,
        ]}
      />
      <Ink style={styles.legendLabel}>{label}</Ink>
    </View>
  );
}

const webShadow = web
  ? ({
      boxShadow: "0 2px 8px rgba(18, 24, 38, 0.05)",
    } as object)
  : {
      shadowColor: "#121826",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    };

const styles = StyleSheet.create({
  page: {
    gap: 22,
    width: "100%",
    flexGrow: 1,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
  },
  heroRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
  },
  hero: {
    gap: 8,
    flex: 1,
    minWidth: 0,
    maxWidth: 640,
  },
  heroRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.primary,
    marginBottom: 2,
  },
  kicker: {
    fontFamily: Type.sansSemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.muted,
  },
  title: {
    fontFamily: Type.displaySemi,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: C.ink,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontFamily: Type.display,
    color: C.primary,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: Skoun.radius.lg,
    backgroundColor: C.primary,
    cursor: "pointer",
    flexShrink: 0,
    ...(web
      ? ({ boxShadow: "0 14px 32px rgba(18, 24, 38, 0.22)" } as object)
      : null),
  },
  metricStacked: {
    width: "100%",
  },
  metricHover: {
    backgroundColor: "#2560D6",
  },
  metricNum: {
    fontFamily: Type.display,
    fontSize: 36,
    lineHeight: 40,
    color: C.inverse,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    minWidth: 44,
  },
  metricNumCompact: {
    fontSize: 30,
    lineHeight: 34,
    minWidth: 36,
  },
  metricCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  metricUnit: {
    fontFamily: Type.sansSemi,
    fontSize: 14,
    color: C.inverse,
  },
  metricRange: {
    fontFamily: Type.sans,
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
  },
  board: {
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    ...webShadow,
  },
  boardCompact: {
    borderRadius: Skoun.radius.md,
  },
  boardFill: {
    padding: 20,
    gap: 16,
    overflow: "hidden",
    position: "relative",
  },
  boardFillCompact: {
    padding: 12,
    gap: 12,
  },
  boardOrb: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(47, 111, 237, 0.08)",
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    zIndex: 1,
  },
  yearTrack: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  yearChip: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  yearChipOn: {
    backgroundColor: C.primary,
  },
  yearChipHover: {
    backgroundColor: C.mist,
  },
  yearChipText: {
    fontFamily: Type.sansSemi,
    fontSize: 13,
    color: C.ink,
  },
  yearChipTextOn: {
    color: C.inverse,
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.surface,
    cursor: "pointer",
  },
  todayBtnOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  todayBtnHover: {
    backgroundColor: C.mist,
  },
  todayBtnText: {
    fontFamily: Type.sansSemi,
    fontSize: 13,
    color: C.primary,
  },
  todayBtnTextOn: {
    color: C.inverse,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    flexShrink: 0,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendOfficial: {
    backgroundColor: C.holiday,
  },
  legendTbc: {
    backgroundColor: C.tbc,
  },
  legendLabel: {
    fontFamily: Type.sansMed,
    fontSize: 12,
    color: C.muted,
  },
  heatRail: {
    flexDirection: "row",
    gap: 4,
    zIndex: 1,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  heatWrap: {
    position: "relative",
    zIndex: 1,
  },
  heatFade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 28,
  },
  heatScroll: {
    flexDirection: "row",
    gap: 4,
    paddingRight: 8,
  },
  heatMonth: {
    minWidth: 56,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "stretch",
    gap: 6,
    cursor: "pointer",
  },
  heatMonthFill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  heatMonthOn: {
    backgroundColor: C.mist,
  },
  heatMonthHover: {
    backgroundColor: "rgba(47, 111, 237, 0.06)",
  },
  heatLabel: {
    fontFamily: Type.sansSemi,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
    textAlign: "center",
  },
  heatLabelOn: {
    color: C.primary,
  },
  heatTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: C.hair,
    overflow: "hidden",
  },
  heatFill: {
    height: 5,
    borderRadius: 3,
  },
  heatCount: {
    fontFamily: Type.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    color: C.holiday,
    fontVariant: ["tabular-nums"],
  },
  heatCountEmpty: {
    color: C.faint,
  },
  heatCountTbc: {
    color: C.tbc,
  },
  heatCountOn: {
    color: C.primary,
  },
  split: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
    zIndex: 1,
  },
  splitStacked: {
    flexDirection: "column",
  },
  plateCol: {
    flex: 1.7,
    minWidth: 0,
    gap: 12,
  },
  plate: {
    gap: 8,
  },
  plateCompact: {
    gap: 6,
  },
  calFrame: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
  },
  monthHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 8,
  },
  monthHeadCopy: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  monthName: {
    fontFamily: Type.displaySemi,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: C.ink,
  },
  monthNameCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  monthYear: {
    fontFamily: Type.sansMed,
    fontSize: 16,
    color: C.faint,
  },
  monthBadge: {
    backgroundColor: C.holidaySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  monthBadgeText: {
    fontFamily: Type.sansSemi,
    fontSize: 11,
    color: C.holiday,
  },
  monthQuiet: {
    fontFamily: Type.sansMed,
    fontSize: 12,
    color: C.faint,
  },
  monthNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  monthNavDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 4,
    backgroundColor: C.border,
  },
  monthNav: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    cursor: "pointer",
  },
  monthNavHover: {
    borderColor: C.soft,
    backgroundColor: C.mist,
  },
  monthNavDisabled: {
    opacity: 0.4,
    cursor: "default",
  },
  weekRow: {
    flexDirection: "row",
    backgroundColor: "#F4F7FC",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  weekHead: {
    flex: 1,
    textAlign: "center",
    fontFamily: Type.sansSemi,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: C.faint,
  },
  weekHeadWeekend: {
    color: C.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: C.surface,
  },
  day: {
    width: "14.285%",
    flexBasis: "14.285%",
    maxWidth: "14.285%",
    minWidth: 0,
    height: 86,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 10,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    position: "relative",
    cursor: "pointer",
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  dayCompact: {
    height: 48,
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 6,
    alignItems: "center",
  },
  dayStacked: {
    height: 64,
  },
  dayLastCol: {
    borderRightWidth: 0,
  },
  dayLastRow: {
    borderBottomWidth: 0,
  },
  dayConfirmed: {
    backgroundColor: C.holidaySoft,
  },
  dayWeekend: {
    backgroundColor: C.weekend,
  },
  daySelected: {
    backgroundColor: C.primary,
    zIndex: 1,
  },
  dayToday: web
    ? ({
        boxShadow: "inset 0 0 0 2px #2F6FED",
      } as object)
    : {
        borderWidth: 2,
        borderColor: C.primary,
      },
  dayHover: {
    backgroundColor: "rgba(47, 111, 237, 0.08)",
  },
  dayOutside: {
    cursor: "default",
    backgroundColor: "#F7F8FA",
  },
  dayTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    zIndex: 1,
    gap: 4,
  },
  dayNum: {
    fontFamily: Type.sansBold,
    fontSize: 14,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  dayNumCompact: {
    fontSize: 13,
  },
  dayMuted: {
    color: "#C5CDD8",
  },
  dayNumConfirmed: {
    color: C.holiday,
  },
  dayNumTentative: {
    color: C.tbc,
  },
  dayNumSelected: {
    color: C.inverse,
  },
  dayNumToday: {
    color: C.primary,
  },
  todayTag: {
    fontFamily: Type.sansSemi,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.primary,
  },
  todayTagOn: {
    color: "rgba(255,255,255,0.72)",
  },
  dayName: {
    fontFamily: Type.sansMed,
    fontSize: 10,
    lineHeight: 13,
    color: C.holiday,
    marginTop: 4,
    zIndex: 1,
    maxWidth: "100%",
  },
  dayNameSelected: {
    color: "rgba(255,255,255,0.82)",
  },
  windowBar: {
    position: "absolute",
    bottom: 5,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.tbc,
    opacity: 0.8,
  },
  windowBarStart: {
    left: 10,
  },
  windowBarEnd: {
    right: 10,
  },
  desk: {
    width: 320,
    flexShrink: 0,
    borderRadius: Skoun.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  deskStacked: {
    width: "100%",
  },
  deskCap: {
    backgroundColor: C.primary,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 2,
  },
  deskWeekday: {
    fontFamily: Type.sansSemi,
    fontSize: 11,
    letterSpacing: 1.6,
    color: "rgba(168, 196, 240, 0.92)",
  },
  deskDay: {
    fontFamily: Type.display,
    fontSize: 64,
    lineHeight: 68,
    color: C.inverse,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  deskDayCompact: {
    fontSize: 52,
    lineHeight: 56,
  },
  deskMonth: {
    fontFamily: Type.sans,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  deskBody: {
    padding: 14,
    gap: 14,
  },
  detailBody: {
    fontFamily: Type.sans,
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
  },
  event: {
    gap: 6,
  },
  eventHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  eventTitle: {
    fontFamily: Type.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    color: C.ink,
    flexShrink: 1,
  },
  eventDetail: {
    fontFamily: Type.sans,
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
  },
  block: {
    gap: 6,
  },
  blockKicker: {
    fontFamily: Type.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.faint,
    marginBottom: 2,
  },
  comingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 10,
    cursor: "pointer",
  },
  comingRowOn: {
    backgroundColor: C.mist,
  },
  comingRowHover: {
    backgroundColor: "rgba(47, 111, 237, 0.06)",
  },
  comingDate: {
    width: 40,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
    gap: 0,
  },
  comingDateOfficial: {
    backgroundColor: C.holidaySoft,
  },
  comingDateTbc: {
    backgroundColor: C.tbcSoft,
  },
  comingDay: {
    fontFamily: Type.sansBold,
    fontSize: 14,
    lineHeight: 16,
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  comingMon: {
    fontFamily: Type.sansSemi,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.muted,
  },
  comingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  comingTitle: {
    fontFamily: Type.sansSemi,
    fontSize: 14,
    color: C.ink,
  },
  comingMeta: {
    fontFamily: Type.sans,
    fontSize: 12,
    color: C.muted,
  },
  colophon: {
    fontFamily: Type.sans,
    fontSize: 11,
    lineHeight: 16,
    color: C.faint,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: C.mist,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTentative: {
    backgroundColor: C.tbcSoft,
  },
  chipText: {
    fontFamily: Type.sansSemi,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.primary,
  },
  chipTextTentative: {
    color: C.tbc,
  },
});
