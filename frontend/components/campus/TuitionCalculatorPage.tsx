import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { CampusFormSelect } from "@/components/campus/CampusFormSelect";
import { LButton } from "@/components/lister/Button";
import { SegmentedPillTrack } from "@/components/listings/SegmentedPillTrack";
import { Skoun } from "@/constants/theme";
import { useCampusHousingStats } from "@/features/campus/useCampusHousingStats";
import { useCampusInstitutions } from "@/features/campus/useCampusInstitutions";
import { useProgramCosts } from "@/features/campus/useProgramCosts";
import { homeBrowseHref } from "@/lib/browseSearchUrl";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

type CostPeriod = "semester" | "year" | "degree";

function parsePeriod(
  period: string | string[] | undefined,
  terms: string | string[] | undefined,
): CostPeriod {
  const p = paramStr(period);
  if (p === "semester" || p === "year" || p === "degree") return p;
  return paramStr(terms) === "2" ? "year" : "semester";
}

export function TuitionCalculatorPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    uni?: string;
    faculty?: string;
    program?: string;
    campus?: string;
    credits?: string;
    custom?: string;
    period?: string;
    terms?: string;
  }>();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= 1024;
  const compact = width < 640;
  const reduced = useReducedMotion();
  const catalog = useCampusInstitutions();

  const [uniSlug, setUniSlug] = useState(paramStr(params.uni));
  const [facultySlug, setFacultySlug] = useState(paramStr(params.faculty));
  const [programSlug, setProgramSlug] = useState(paramStr(params.program));
  const [campusSlug, setCampusSlug] = useState(paramStr(params.campus));
  const [customLoad, setCustomLoad] = useState(
    paramStr(params.custom) === "1",
  );
  const [credits, setCredits] = useState(
    Number(paramStr(params.credits)) || 0,
  );
  const [period, setPeriod] = useState<CostPeriod>(
    parsePeriod(params.period, params.terms),
  );

  const institution = useMemo(
    () => catalog.data?.find((row) => row.slug === uniSlug) ?? null,
    [catalog.data, uniSlug],
  );
  const faculty = useMemo(
    () => institution?.faculties.find((row) => row.slug === facultySlug) ?? null,
    [institution, facultySlug],
  );
  const program = useMemo(
    () => faculty?.programs.find((row) => row.slug === programSlug) ?? null,
    [faculty, programSlug],
  );

  const uniOptions = useMemo(
    () =>
      (catalog.data ?? []).map((row) => ({
        value: row.slug,
        label: row.shortName,
        detail: row.name,
      })),
    [catalog.data],
  );
  const facultyOptions = useMemo(
    () =>
      (institution?.faculties ?? []).map((row) => ({
        value: row.slug,
        label: row.name,
      })),
    [institution],
  );
  const programOptions = useMemo(
    () =>
      (faculty?.programs ?? []).map((row) => ({
        value: row.slug,
        label: row.name,
      })),
    [faculty],
  );
  const campusOptions = useMemo(
    () =>
      (institution?.campuses ?? []).map((row) => ({
        value: row.slug,
        label: row.name,
      })),
    [institution],
  );

  useEffect(() => {
    if (!institution || campusSlug) return;
    const main =
      institution.campuses.find((c) => c.isMain) ?? institution.campuses[0];
    if (main) setCampusSlug(main.slug);
  }, [institution, campusSlug]);

  const writeParams = useCallback(
    (next: {
      uni?: string;
      faculty?: string;
      program?: string;
      campus?: string;
      credits?: number;
      custom?: boolean;
      period?: CostPeriod;
    }) => {
      const usingCustom = next.custom ?? customLoad;
      const creditValue = usingCustom
        ? (next.credits ?? credits)
        : undefined;
      const nextPeriod = next.period ?? period;
      router.setParams({
        uni: (next.uni ?? uniSlug) || undefined,
        faculty: (next.faculty ?? facultySlug) || undefined,
        program: (next.program ?? programSlug) || undefined,
        campus: (next.campus ?? campusSlug) || undefined,
        credits: creditValue ? String(creditValue) : undefined,
        custom: usingCustom ? "1" : undefined,
        period: nextPeriod,
        terms: undefined,
      } as never);
    },
    [
      router,
      uniSlug,
      facultySlug,
      programSlug,
      campusSlug,
      credits,
      customLoad,
      period,
    ],
  );

  const pickUni = (slug: string) => {
    const row = catalog.data?.find((item) => item.slug === slug);
    if (!row) return;
    setUniSlug(row.slug);
    setFacultySlug("");
    setProgramSlug("");
    const main = row.campuses.find((c) => c.isMain) ?? row.campuses[0];
    setCampusSlug(main?.slug ?? "");
    setCredits(0);
    setCustomLoad(false);
    writeParams({
      uni: row.slug,
      faculty: "",
      program: "",
      campus: main?.slug ?? "",
      credits: 0,
      custom: false,
    });
  };

  const pickFaculty = (slug: string) => {
    setFacultySlug(slug);
    setProgramSlug("");
    setCustomLoad(false);
    setCredits(0);
    writeParams({ faculty: slug, program: "", custom: false, credits: 0 });
  };

  const pickProgram = (slug: string) => {
    const row = faculty?.programs.find((item) => item.slug === slug);
    if (!row) return;
    setProgramSlug(row.slug);
    setCredits(row.defaultCredits);
    setCustomLoad(false);
    writeParams({
      program: row.slug,
      credits: 0,
      custom: false,
    });
  };

  const pickCampus = (slug: string) => {
    setCampusSlug(slug);
    writeParams({ campus: slug });
  };

  const creditUnit = program?.creditSystem === "ects" ? "ECTS" : "credits";
  const typicalCredits = program?.defaultCredits ?? 15;
  const totalMajorCredits =
    program?.totalCredits ??
    (program?.creditSystem === "ects" ? 180 : 120);
  const defaultLoadCredits =
    period === "degree" ? totalMajorCredits : typicalCredits;
  const effectiveCredits = customLoad
    ? Math.min(totalMajorCredits, Math.max(0, credits))
    : defaultLoadCredits;

  const costs = useProgramCosts(program?.id ?? null, effectiveCredits, period);
  const housing = useCampusHousingStats(campusSlug || null);

  const grandTotal = costs.data?.totalUsd ?? 0;

  const onSeeRooms = () => {
    router.push(
      homeBrowseHref({
        universitySlugs: campusSlug ? [campusSlug] : undefined,
      }) as never,
    );
  };

  const copyLink = async () => {
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.href
        : `https://skoun.app/campus/calculator?uni=${uniSlug}&faculty=${facultySlug}&program=${programSlug}`;
    if (Platform.OS === "web" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };

  const formColumn = (
    <View style={[styles.formCol, wide && styles.formColWide]}>
      <View style={styles.hero}>
        <View style={styles.heroRule} />
        <Text style={styles.kicker}>Tuition & study cost</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          What will this major cost?
        </Text>
        <Text style={[styles.lede, compact && styles.ledeCompact]}>
          Estimate published USD tuition for private universities in Lebanon,
          then jump to rooms near that campus.
        </Text>
      </View>

      <View style={styles.formCard}>
        <LinearGradient
          colors={["#EAF1FC", "#FFFFFF", "#F7F9FC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.formCardFill, compact && styles.formCardFillCompact]}
        >
          {catalog.isLoading ? (
            <ActivityIndicator color={Skoun.color.primary} />
          ) : null}

          <CampusFormSelect
            label="University"
            value={uniSlug}
            options={uniOptions}
            placeholder="Choose a university"
            searchable
            searchPlaceholder="Search universities…"
            onChange={pickUni}
          />

          <CampusFormSelect
            label="Faculty"
            value={facultySlug}
            options={facultyOptions}
            placeholder={
              institution ? "Choose a faculty" : "Select a university first"
            }
            disabled={!institution}
            searchable={facultyOptions.length > 8}
            searchPlaceholder="Search faculties…"
            onChange={pickFaculty}
          />

          <CampusFormSelect
            label="Major / program"
            value={programSlug}
            options={programOptions}
            placeholder={
              !faculty
                ? "Select a faculty first"
                : faculty.programs.length === 0
                  ? "No tuition table for this faculty yet"
                  : "Choose a major or program"
            }
            disabled={!faculty || faculty.programs.length === 0}
            searchable={programOptions.length > 8}
            searchPlaceholder="Search programs…"
            onChange={pickProgram}
          />

          <CampusFormSelect
            label="Campus"
            value={campusSlug}
            options={campusOptions}
            placeholder={
              institution ? "Choose a campus" : "Select a university first"
            }
            disabled={!institution || campusOptions.length === 0}
            onChange={pickCampus}
          />
          {institution ? (
            <Text style={styles.fieldNote}>
              Used to find housing near this campus.
            </Text>
          ) : null}

          {faculty && faculty.programs.length === 0 ? (
            <Text style={styles.hint}>
              No tuition table for this faculty yet. Rooms near campus still
              work.
            </Text>
          ) : null}

          {program ? (
            <>
              <View style={styles.formDivider} />

              <Text style={styles.label}>Estimate for</Text>
              <SegmentedPillTrack
                value={period}
                options={[
                  { value: "semester", label: "Semester" },
                  { value: "year", label: "Year" },
                  { value: "degree", label: "Full degree" },
                ]}
                onChange={(next) => {
                  setPeriod(next);
                  if (!customLoad && program) {
                    setCredits(
                      next === "degree"
                        ? totalMajorCredits
                        : program.defaultCredits,
                    );
                  }
                  writeParams({ period: next });
                }}
                accessibilityLabel="Semester, year, or full degree"
                fill
              />

              <View style={styles.loadCard}>
                <Text style={styles.loadTitle}>Credit load</Text>
                <Text style={styles.loadBody}>
                  {period === "degree" ? (
                    <>
                      Estimate uses the full major requirement of{" "}
                      <Text style={styles.loadEmphasis}>
                        {totalMajorCredits} {creditUnit}
                      </Text>
                      .
                    </>
                  ) : (
                    <>
                      Estimate uses a typical full-time load of{" "}
                      <Text style={styles.loadEmphasis}>
                        {typicalCredits} {creditUnit}
                      </Text>{" "}
                      per semester
                      {program.maxBilledCredits
                        ? ` (billed up to ${program.maxBilledCredits})`
                        : ""}
                      .
                    </>
                  )}
                </Text>

                <Pressable
                  onPress={() => {
                    const next = !customLoad;
                    setCustomLoad(next);
                    const nextCredits = next
                      ? credits >= 1
                        ? credits
                        : defaultLoadCredits
                      : defaultLoadCredits;
                    setCredits(nextCredits);
                    writeParams({
                      custom: next,
                      credits: next ? nextCredits : 0,
                    });
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: customLoad }}
                  accessibilityLabel="Customize credit load"
                  style={styles.customToggle}
                >
                  <View
                    style={[
                      styles.switchTrack,
                      customLoad && styles.switchTrackOn,
                    ]}
                  >
                    <View style={styles.switchThumb} />
                  </View>
                  <Text style={styles.customToggleLabel}>
                    Enter a custom credit load
                  </Text>
                </Pressable>

                {customLoad ? (
                  <View style={styles.customField}>
                    <Text style={styles.customFieldLabel}>
                      {period === "degree"
                        ? `${creditUnit} in this major`
                        : `${creditUnit} this semester`}
                    </Text>
                    <TextInput
                      value={
                        customLoad && credits === 0
                          ? "0"
                          : credits
                            ? String(credits)
                            : ""
                      }
                      onChangeText={(text) => {
                        const digits = text.replace(/[^\d]/g, "");
                        if (digits === "") {
                          setCredits(0);
                          writeParams({ custom: true, credits: 0 });
                          return;
                        }
                        const next = Math.min(
                          totalMajorCredits,
                          Math.max(0, Number(digits)),
                        );
                        setCredits(next);
                        writeParams({ custom: true, credits: next });
                      }}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="0"
                      placeholderTextColor={Skoun.color.inkFaint}
                      accessibilityLabel={`Custom ${creditUnit}`}
                      style={styles.creditInput}
                    />
                    <Text style={styles.hint}>
                      From 0 to {totalMajorCredits} {creditUnit} for this
                      major.
                      {program.maxBilledCredits
                        ? ` Billing caps at ${program.maxBilledCredits} per term.`
                        : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </LinearGradient>
      </View>
    </View>
  );

  const ledgerCard = (
    <View style={[styles.ledger, wide && styles.ledgerWide]}>
      <LinearGradient
        colors={["#E6EEFA", "#FFFFFF", "#F5F7FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ledgerFill, compact && styles.ledgerFillCompact]}
      >
        {!program ? (
          <>
            <Text style={styles.placeholder}>
              {faculty && faculty.programs.length === 0
                ? "Tuition for this faculty isn’t in Skoun yet. You can still browse rooms near campus."
                : "Pick a university, faculty, and major to see the ledger."}
            </Text>
            {campusSlug ? (
              <LButton
                label="See rooms near campus"
                onPress={onSeeRooms}
                accessibilityHint="Opens housing search near this campus"
                style={styles.housingCta}
              />
            ) : null}
          </>
        ) : costs.isLoading ? (
          <ActivityIndicator color={Skoun.color.primary} />
        ) : costs.isError ? (
          <Text style={styles.error} accessibilityRole="alert">
            Couldn’t load this estimate. Try again.
          </Text>
        ) : costs.data ? (
          <>
            <Text style={styles.ledgerKicker}>
              {costs.data.institution.shortName} · {costs.data.program.name}
            </Text>
            <Text
              style={[
                styles.total,
                compact && styles.totalCompact,
                !reduced && styles.totalEnter,
              ]}
            >
              {money(grandTotal)}
            </Text>
            <Text style={styles.totalSub}>
              {period === "degree"
                ? "Full degree"
                : period === "year"
                  ? "Academic year"
                  : "One semester"}{" "}
              · fresh USD
            </Text>

            <View style={styles.rule} />

            {costs.data.lines.map((line) => (
              <View key={line.label} style={styles.line}>
                <Text style={styles.lineLabel}>{line.label}</Text>
                <Text style={styles.lineAmt}>{money(line.amountUsd)}</Text>
              </View>
            ))}

            <Text style={styles.disclaimer}>{costs.data.disclaimer}</Text>
            <Text style={styles.years}>
              Sources: {costs.data.academicYears.join(" · ")}
            </Text>
            {costs.data.program.sourceUrl ? (
              <Pressable
                onPress={() =>
                  void Linking.openURL(costs.data!.program.sourceUrl)
                }
                accessibilityRole="link"
              >
                <Text style={styles.sourceLink}>Open tuition source</Text>
              </Pressable>
            ) : null}

            <View style={styles.rule} />

            <Text style={styles.housingTitle}>Housing near campus</Text>
            {housing.data && housing.data.count > 0 ? (
              <Text style={styles.housingBody}>
                Live listings from {money(housing.data.minUsd ?? 0)}/mo ·
                median {money(housing.data.medianUsd ?? 0)}/mo (
                {housing.data.count} within{" "}
                {(housing.data.radiusMeters / 1000).toFixed(1)} km)
              </Text>
            ) : (
              <Text style={styles.housingBody}>
                No live rooms near this campus yet. You can still browse
                housing.
              </Text>
            )}
            <LButton
              label="See rooms near campus"
              onPress={onSeeRooms}
              accessibilityHint="Opens housing search near this campus"
              style={styles.housingCta}
            />
            {Platform.OS === "web" ? (
              <Pressable
                onPress={() => void copyLink()}
                accessibilityRole="button"
              >
                <Text style={styles.sourceLink}>
                  Copy link to this estimate
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </LinearGradient>
    </View>
  );

  // Web: document scroll + CSS sticky ledger (RN ScrollView breaks sticky).
  if (Platform.OS === "web") {
    return (
      <View style={styles.page}>
        <View style={[styles.content, wide && styles.contentWide]}>
          {formColumn}
          {ledgerCard}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {formColumn}
        {ledgerCard}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: {
    width: "100%",
    alignSelf: "stretch",
    paddingBottom: 48,
  },
  content: {
    gap: 28,
    width: "100%",
  },
  contentWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 32,
  },
  formCol: { flex: 1, gap: 16, minWidth: 0 },
  formColWide: { flex: 1.15 },
  hero: {
    gap: 10,
    maxWidth: 560,
  },
  heroRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Skoun.color.primary,
    marginBottom: 2,
  },
  kicker: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Skoun.color.inkMuted,
  },
  title: {
    fontFamily: Skoun.type.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: Skoun.color.ink,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  lede: {
    fontFamily: Skoun.type.body,
    fontSize: 16,
    lineHeight: 24,
    color: Skoun.color.inkMuted,
    maxWidth: 520,
  },
  ledeCompact: {
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    position: 'relative',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D5DCE7',
    borderRadius: Skoun.radius.lg,
    overflow: 'hidden',
    backgroundColor: Skoun.color.surface,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 2px 8px rgba(18, 24, 38, 0.05)',
        } as object)
      : {
          shadowColor: '#121826',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
        }),
  },
  formCardFill: {
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 22,
    gap: 18,
    overflow: "hidden",
  },
  formCardFillCompact: {
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 14,
    gap: 14,
  },
  formDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 4,
  },
  fieldNote: {
    marginTop: -10,
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkFaint,
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.ink,
  },
  hint: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkFaint,
  },
  loadCard: {
    gap: 12,
    padding: 14,
    borderRadius: Skoun.radius.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: '#D9E3F4',
  },
  loadTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: Skoun.color.inkMuted,
  },
  loadBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
  },
  loadEmphasis: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.ink,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    cursor: 'pointer',
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Skoun.color.border,
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  switchTrackOn: {
    backgroundColor: Skoun.color.primary,
    justifyContent: 'flex-end',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Skoun.color.surface,
  },
  customToggleLabel: {
    flex: 1,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  customField: {
    gap: 8,
    paddingTop: 4,
  },
  customFieldLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.ink,
  },
  creditInput: {
    borderWidth: 1.5,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
    minHeight: 48,
    maxWidth: 160,
    outlineStyle: 'none' as unknown as undefined,
  },
  ledger: {
    borderWidth: 1,
    borderColor: '#D5DCE7',
    borderRadius: Skoun.radius.lg,
    overflow: 'hidden',
    backgroundColor: Skoun.color.surface,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 2px 8px rgba(18, 24, 38, 0.05)',
        } as object)
      : {
          shadowColor: '#121826',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
        }),
  },
  ledgerFill: {
    padding: 24,
    gap: 8,
    overflow: "hidden",
    minHeight: 180,
  },
  ledgerFillCompact: {
    padding: 16,
  },
  ledgerWide: {
    width: 400,
    flexShrink: 0,
    alignSelf: "flex-start",
    position: "sticky" as unknown as "relative",
    top: WEB_NAV_HEIGHT + 16,
    maxHeight: `calc(100vh - ${WEB_NAV_HEIGHT + 32}px)` as unknown as number,
    overflow: "auto" as unknown as "visible",
    zIndex: 5,
  },
  placeholder: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.inkFaint,
    lineHeight: 22,
    zIndex: 1,
  },
  error: {
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.danger,
    zIndex: 1,
  },
  ledgerKicker: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.inkMuted,
    zIndex: 1,
  },
  total: {
    fontFamily: Skoun.type.display,
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -0.8,
    color: Skoun.color.ink,
    fontVariant: ['tabular-nums'],
    zIndex: 1,
  },
  totalCompact: {
    fontSize: 36,
    lineHeight: 42,
  },
  totalEnter: {},
  totalSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
    marginBottom: 8,
    zIndex: 1,
  },
  rule: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    zIndex: 1,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    zIndex: 1,
  },
  lineLabel: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  lineAmt: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    fontVariant: ['tabular-nums'],
  },
  disclaimer: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 18,
    color: Skoun.color.inkFaint,
    marginTop: 8,
    zIndex: 1,
  },
  years: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: Skoun.color.inkMuted,
    zIndex: 1,
  },
  sourceLink: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.primary,
    textDecorationLine: 'underline',
    marginTop: 4,
    zIndex: 1,
  },
  housingTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    color: Skoun.color.ink,
    marginTop: 4,
    zIndex: 1,
  },
  housingBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
    zIndex: 1,
  },
  housingCta: {
    marginTop: 8,
    alignSelf: 'stretch',
    zIndex: 1,
  },
});

