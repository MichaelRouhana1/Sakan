import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { ACADEMIC_CATALOG, CAMPUS_CATALOG } from "@/constants/campusCatalogStats";
import { Skoun } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { useCampusHousingStats } from "@/features/campus/useCampusHousingStats";
import { useCampusInstitutions } from "@/features/campus/useCampusInstitutions";
import { useProgramCosts } from "@/features/campus/useProgramCosts";
import type { CostLine } from "@/features/campus/types";
import { homeBrowseHref } from "@/lib/browseSearchUrl";
import { useReducedMotion } from "@/lib/useReducedMotion";

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

type CostPeriod = "semester" | "year" | "degree";

const PERIOD_COPY: Record<CostPeriod, string> = {
  semester: "One semester",
  year: "Academic year",
  degree: "Full degree",
};

const BAR_COLOR: Record<CostLine["kind"], string> = {
  tuition: Skoun.color.primary,
  fee: "#3D4F73",
  living: Skoun.color.primarySoft,
};

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
  const [copied, setCopied] = useState(false);
  const [creditFocused, setCreditFocused] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        slug: row.slug,
        logoUrl: row.logoUrl,
        website: row.website,
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
        detail: row.city ?? undefined,
      })),
    [institution],
  );

  useEffect(() => {
    if (!institution || campusSlug) return;
    const main =
      institution.campuses.find((c) => c.isMain) ?? institution.campuses[0];
    if (main) setCampusSlug(main.slug);
  }, [institution, campusSlug]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

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
  const campusName =
    institution?.campuses.find((row) => row.slug === campusSlug)?.name ??
    "campus";

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
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const setCustomCredits = (next: number) => {
    const clamped = Math.min(totalMajorCredits, Math.max(0, next));
    setCredits(clamped);
    writeParams({ custom: true, credits: clamped });
  };

  const toggleCustomLoad = () => {
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
  };

  const steps = [
    { key: "uni", label: "University", done: Boolean(institution) },
    { key: "faculty", label: "Faculty", done: Boolean(faculty) },
    {
      key: "major",
      label: "Major",
      done: Boolean(program),
    },
    { key: "campus", label: "Campus", done: Boolean(campusSlug) },
  ];

  const formColumn = (
    <View style={[styles.formCol, wide && styles.formColWide]}>
      <View style={styles.hero}>
        <View style={styles.heroRule} />
        <Text style={styles.kicker}>Tuition & study cost</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          What will this major cost?
        </Text>
        <Text style={styles.heroMeta}>
          {CAMPUS_CATALOG.universities} universities · {ACADEMIC_CATALOG.programs}{" "}
          programs · {ACADEMIC_CATALOG.tuitionYear}
        </Text>
      </View>

      <View style={styles.formCard}>
        <LinearGradient
          colors={["#EAF1FC", "#FFFFFF", "#F7F9FC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.formCardFill, compact && styles.formCardFillCompact]}
        >
          <View style={styles.formOrb} pointerEvents="none" />

          {catalog.isLoading ? (
            <View style={styles.catalogStatus}>
              <ActivityIndicator color={Skoun.color.primary} />
              <Text style={styles.hint}>Loading universities…</Text>
            </View>
          ) : null}

          {catalog.isError ? (
            <Text style={styles.error} accessibilityRole="alert">
              Couldn’t load the university catalog. Refresh and try again.
            </Text>
          ) : null}

          <ProgressRail steps={steps} compact={compact} />

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
                appearance="well"
                fill
              />

              <View style={styles.loadCard}>
                <View style={styles.loadHead}>
                  <Text style={styles.loadTitle}>Credit load</Text>
                  <Pressable
                    onPress={toggleCustomLoad}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: customLoad }}
                    accessibilityLabel="Customize credit load"
                    style={({ hovered, pressed }) => [
                      styles.customToggle,
                      (hovered || pressed) && styles.customToggleHover,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchTrack,
                        customLoad && styles.switchTrackOn,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          customLoad && styles.switchThumbOn,
                          !reduced && styles.switchThumbMotion,
                        ]}
                      />
                    </View>
                    <Text style={styles.customToggleLabel}>Customize</Text>
                  </Pressable>
                </View>

                {customLoad ? (
                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => setCustomCredits(effectiveCredits - 1)}
                      disabled={effectiveCredits <= 0}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${creditUnit}`}
                      style={({ hovered, pressed }) => [
                        styles.stepperBtn,
                        (hovered || pressed) &&
                          effectiveCredits > 0 &&
                          styles.stepperBtnHover,
                        effectiveCredits <= 0 && styles.stepperBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={
                          effectiveCredits <= 0
                            ? Skoun.color.inkFaint
                            : Skoun.color.ink
                        }
                      />
                    </Pressable>
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
                          setCustomCredits(0);
                          return;
                        }
                        setCustomCredits(Number(digits));
                      }}
                      onFocus={() => setCreditFocused(true)}
                      onBlur={() => setCreditFocused(false)}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="0"
                      placeholderTextColor={Skoun.color.inkFaint}
                      accessibilityLabel={`Custom ${creditUnit}`}
                      style={[
                        styles.creditInput,
                        creditFocused && styles.creditInputFocus,
                      ]}
                    />
                    <Pressable
                      onPress={() => setCustomCredits(effectiveCredits + 1)}
                      disabled={effectiveCredits >= totalMajorCredits}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${creditUnit}`}
                      style={({ hovered, pressed }) => [
                        styles.stepperBtn,
                        (hovered || pressed) &&
                          effectiveCredits < totalMajorCredits &&
                          styles.stepperBtnHover,
                        effectiveCredits >= totalMajorCredits &&
                          styles.stepperBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={
                          effectiveCredits >= totalMajorCredits
                            ? Skoun.color.inkFaint
                            : Skoun.color.ink
                        }
                      />
                    </Pressable>
                    <Text style={styles.loadUnit}>
                      {creditUnit}
                      {period === "degree" ? " in this major" : " this semester"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadMeter}>
                    <Text
                      style={[
                        styles.loadFigure,
                        compact && styles.loadFigureCompact,
                      ]}
                    >
                      {defaultLoadCredits}
                    </Text>
                    <Text style={styles.loadUnit}>
                      {creditUnit}
                      {period === "degree"
                        ? " required for this major"
                        : " typical full-time load"}
                    </Text>
                  </View>
                )}

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
                  {customLoad
                    ? ` Enter from 0 to ${totalMajorCredits}${
                        program.maxBilledCredits
                          ? `. Billing caps at ${program.maxBilledCredits} per term`
                          : ""
                      }.`
                    : null}
                </Text>
              </View>
            </>
          ) : null}
        </LinearGradient>
      </View>
    </View>
  );

  const noTable = Boolean(faculty && faculty.programs.length === 0);
  const hasProgram = Boolean(program && institution);
  const ledgerReady = Boolean(hasProgram && costs.data);

  const ledgerCard = (
    <View
      nativeID="tuition-ledger"
      style={[styles.ledger, wide && styles.ledgerWide]}
      {...(Platform.OS === "web" && hasProgram && !reduced
        ? ({ className: "sk-campus-in" } as object)
        : null)}
    >
      <View style={[styles.mast, compact && styles.mastCompact]}>
        <Text style={styles.mastKicker}>
          {hasProgram
            ? PERIOD_COPY[period]
            : noTable
              ? "No published table yet"
              : "Published ledger"}
        </Text>
        {hasProgram && institution && program ? (
          <View style={styles.mastIdentity}>
            <InstitutionLogo
              shortName={institution.shortName}
              slug={institution.slug}
              logoUrl={institution.logoUrl}
              size={36}
              fallbackStyle={styles.mastLogoFrame}
            />
            <View style={styles.mastIdentityCopy}>
              <Text style={styles.mastSchool} numberOfLines={1}>
                {institution.shortName}
              </Text>
              <Text style={styles.mastProgram} numberOfLines={2}>
                {program.name}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.mastIdentity}>
            <View style={styles.mastGhostMark}>
              <Ionicons
                name="calculator-outline"
                size={18}
                color="rgba(255,255,255,0.55)"
              />
            </View>
            <Text style={styles.mastGhostLabel}>
              {noTable
                ? "This faculty isn’t in the tuition table yet."
                : !institution
                  ? "Waiting on a university, faculty, and major."
                  : !faculty
                    ? "University set. Choose a faculty and major."
                    : "Faculty set. Choose a major to print the statement."}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.total,
            compact && styles.totalCompact,
            !ledgerReady && styles.totalPending,
          ]}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {ledgerReady
            ? money(grandTotal)
            : hasProgram
              ? "…"
              : "$\u2014"}
        </Text>
        <Text style={styles.totalSub}>
          {hasProgram
            ? `${PERIOD_COPY[period]} · fresh USD`
            : "Fresh USD · official published rates"}
        </Text>
      </View>

      <View style={[styles.ledgerBody, compact && styles.ledgerBodyCompact]}>
        {!program ? (
          <>
            <Text style={styles.placeholder}>
              {noTable
                ? "Tuition for this faculty isn’t in Skoun yet. You can still browse rooms near campus."
                : "Choose a university, faculty, and major. The statement prints as soon as a program is set."}
            </Text>
            <View style={styles.checklist}>
              {steps.map((step) => (
                <View key={step.key} style={styles.checkRow}>
                  <Ionicons
                    name={step.done ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={
                      step.done ? Skoun.color.primary : Skoun.color.inkFaint
                    }
                  />
                  <Text
                    style={[
                      styles.checkLabel,
                      step.done && styles.checkLabelDone,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
            {campusSlug ? (
              <LButton
                label={`See rooms near ${campusName}`}
                onPress={onSeeRooms}
                accessibilityHint="Opens housing search near this campus"
                style={styles.housingCta}
              />
            ) : null}
          </>
        ) : !costs.data && (costs.isLoading || costs.isFetching) ? (
          <View style={styles.ledgerWait}>
            <ActivityIndicator color={Skoun.color.primary} />
            <Text style={styles.placeholder}>Adding up published rates…</Text>
          </View>
        ) : costs.isError ? (
          <Text style={styles.error} accessibilityRole="alert">
            Couldn’t load this estimate. Try again.
          </Text>
        ) : costs.data ? (
          <>
            {costs.data.lines.map((line) => (
              <CostBar
                key={line.label}
                line={line}
                total={grandTotal}
                reduced={reduced}
              />
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
                style={({ hovered, pressed }) => [
                  styles.textBtn,
                  (hovered || pressed) && styles.textBtnHover,
                ]}
              >
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={Skoun.color.primary}
                />
                <Text style={styles.textBtnLabel}>Open tuition source</Text>
              </Pressable>
            ) : null}

            <View style={styles.housingRule} />
            <View style={styles.housingBlock}>
              <View style={styles.housingTop}>
                <Ionicons
                  name="home-outline"
                  size={16}
                  color={Skoun.color.primary}
                />
                <Text style={styles.housingTitle}>Housing near {campusName}</Text>
              </View>
              {housing.data && housing.data.count > 0 ? (
                <View style={styles.housingStats}>
                  <View style={styles.housingStat}>
                    <Text style={styles.housingStatValue}>
                      {money(housing.data.minUsd ?? 0)}
                    </Text>
                    <Text style={styles.housingStatLabel}>from / mo</Text>
                  </View>
                  <View style={styles.housingStatRule} />
                  <View style={styles.housingStat}>
                    <Text style={styles.housingStatValue}>
                      {money(housing.data.medianUsd ?? 0)}
                    </Text>
                    <Text style={styles.housingStatLabel}>median / mo</Text>
                  </View>
                  <View style={styles.housingStatRule} />
                  <View style={styles.housingStat}>
                    <Text style={styles.housingStatValue}>
                      {housing.data.count}
                    </Text>
                    <Text style={styles.housingStatLabel}>
                      within {(housing.data.radiusMeters / 1000).toFixed(1)} km
                    </Text>
                  </View>
                </View>
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
            </View>

            {Platform.OS === "web" ? (
              <Pressable
                onPress={() => void copyLink()}
                accessibilityRole="button"
                accessibilityLabel={
                  copied ? "Link copied" : "Copy link to this estimate"
                }
                style={({ hovered, pressed }) => [
                  styles.textBtn,
                  (hovered || pressed) && styles.textBtnHover,
                ]}
              >
                <Ionicons
                  name={copied ? "checkmark" : "link-outline"}
                  size={16}
                  color={copied ? Skoun.color.primary : Skoun.color.primary}
                />
                <Text style={styles.textBtnLabel}>
                  {copied ? "Copied" : "Copy link to this estimate"}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
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

function ProgressRail({
  steps,
  compact,
}: {
  steps: { key: string; label: string; done: boolean }[];
  compact: boolean;
}) {
  return (
    <View
      style={styles.rail}
      accessibilityRole="progressbar"
      accessibilityLabel={`Calculator steps, ${steps.filter((s) => s.done).length} of ${steps.length} complete`}
    >
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          {index > 0 ? (
            <View
              style={[
                styles.railLine,
                steps[index - 1]!.done && styles.railLineDone,
              ]}
            />
          ) : null}
          <View style={styles.railStep}>
            <View
              style={[styles.railDot, step.done && styles.railDotDone]}
            >
              {step.done ? (
                <Ionicons name="checkmark" size={10} color="#fff" />
              ) : (
                <Text style={styles.railIndex}>{index + 1}</Text>
              )}
            </View>
            {compact ? null : (
              <Text
                style={[styles.railLabel, step.done && styles.railLabelDone]}
              >
                {step.label}
              </Text>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

function CostBar({
  line,
  total,
  reduced,
}: {
  line: CostLine;
  total: number;
  reduced: boolean;
}) {
  const pct = total > 0 ? Math.max(2, (line.amountUsd / total) * 100) : 0;
  return (
    <View style={styles.line}>
      <View style={styles.lineHead}>
        <Text style={styles.lineLabel}>{line.label}</Text>
        <Text style={styles.lineAmt}>{money(line.amountUsd)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          {...(Platform.OS === "web" && !reduced
            ? ({ className: "sk-campus-bar" } as object)
            : null)}
          style={[
            styles.barFill,
            {
              width: `${pct}%`,
              backgroundColor: BAR_COLOR[line.kind],
            },
          ]}
        />
      </View>
    </View>
  );
}

const webShadow = Platform.OS === "web"
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
    textTransform: "uppercase",
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
  heroMeta: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: Skoun.color.inkFaint,
  },
  formCard: {
    position: "relative",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#D5DCE7",
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    ...webShadow,
  },
  formCardFill: {
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 22,
    gap: 18,
    overflow: "hidden",
  },
  formCardFillCompact: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 14,
    gap: 14,
  },
  formOrb: {
    position: "absolute",
    bottom: -70,
    right: -48,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(47, 111, 237, 0.08)",
  },
  catalogStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 1,
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginBottom: 4,
    zIndex: 1,
  },
  railStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  railDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#C5D6F5",
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  railDotDone: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  railIndex: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 10,
    color: Skoun.color.inkMuted,
  },
  railLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.inkFaint,
  },
  railLabelDone: {
    color: Skoun.color.ink,
  },
  railLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#D9E3F4",
    marginHorizontal: 8,
  },
  railLineDone: {
    backgroundColor: Skoun.color.primarySoft,
  },
  formDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
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
    padding: 16,
    borderRadius: Skoun.radius.md,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "#D9E3F4",
  },
  loadHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  loadTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: Skoun.color.inkMuted,
  },
  loadMeter: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  loadFigure: {
    fontFamily: Skoun.type.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: Skoun.color.ink,
    fontVariant: ["tabular-nums"],
  },
  loadFigureCompact: {
    fontSize: 32,
    lineHeight: 36,
  },
  loadUnit: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
    flexShrink: 1,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    cursor: "pointer",
  },
  customToggleHover: {
    opacity: 0.85,
  },
  customToggleLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: Skoun.color.ink,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Skoun.color.border,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  switchTrackOn: {
    backgroundColor: Skoun.color.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Skoun.color.surface,
  },
  switchThumbOn: {
    transform: [{ translateX: 18 }],
  },
  switchThumbMotion:
    Platform.OS === "web"
      ? ({
          transitionProperty: "transform",
          transitionDuration: "180ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : {},
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  stepperBtnHover: {
    borderColor: Skoun.color.primarySoft,
    backgroundColor: Skoun.color.primaryMist,
  },
  stepperBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  creditInput: {
    borderWidth: 1.5,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 22,
    lineHeight: 28,
    color: Skoun.color.ink,
    minHeight: 48,
    minWidth: 72,
    maxWidth: 96,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    outlineStyle: "none" as unknown as undefined,
  },
  creditInputFocus: {
    borderColor: Skoun.color.primary,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: `0 0 0 3px ${Skoun.color.primaryMist}`,
        } as object)
      : null),
  },
  ledger: {
    borderWidth: 1,
    borderColor: "#D5DCE7",
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    ...webShadow,
  },
  ledgerWide: {
    width: 420,
    flexShrink: 0,
    alignSelf: "flex-start",
    position: "sticky" as unknown as "relative",
    top: WEB_NAV_HEIGHT + 16,
    zIndex: 5,
  },
  mast: {
    backgroundColor: Skoun.color.primaryDeep,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 8,
  },
  mastCompact: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  mastKicker: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },
  mastIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mastIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mastLogoFrame: {
    borderColor: "rgba(255,255,255,0.18)",
  },
  mastSchool: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },
  mastProgram: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  mastGhostMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  mastGhostLabel: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.62)",
  },
  total: {
    fontFamily: Skoun.type.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  totalCompact: {
    fontSize: 36,
    lineHeight: 42,
  },
  totalPending: {
    letterSpacing: 0,
    opacity: 0.42,
  },
  totalSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.62)",
  },
  ledgerBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: Skoun.color.surface,
  },
  ledgerBodyCompact: {
    padding: 16,
  },
  ledgerWait: {
    gap: 12,
    paddingVertical: 8,
  },
  placeholder: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.inkMuted,
    lineHeight: 22,
  },
  checklist: {
    gap: 10,
    paddingVertical: 4,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.inkFaint,
  },
  checkLabelDone: {
    color: Skoun.color.ink,
  },
  error: {
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.danger,
  },
  line: {
    gap: 6,
    paddingBottom: 4,
  },
  lineHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  lineLabel: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  lineAmt: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Skoun.color.primaryMist,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },
  disclaimer: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 16,
    color: Skoun.color.inkFaint,
  },
  years: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  textBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 2,
    cursor: "pointer",
  },
  textBtnHover: {
    opacity: 0.8,
  },
  textBtnLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.primary,
  },
  housingRule: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 6,
    marginBottom: 2,
  },
  housingBlock: {
    gap: 10,
  },
  housingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  housingTitle: {
    flex: 1,
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  housingStats: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  housingStat: {
    flex: 1,
    gap: 2,
  },
  housingStatValue: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
    fontVariant: ["tabular-nums"],
  },
  housingStatLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkFaint,
  },
  housingStatRule: {
    width: 1,
    backgroundColor: "#D9E3F4",
    marginHorizontal: 10,
  },
  housingBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
  },
  housingCta: {
    marginTop: 2,
    alignSelf: "stretch",
    minHeight: 44,
  },
});
