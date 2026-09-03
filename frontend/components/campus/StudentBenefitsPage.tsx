import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BenefitCard,
  BenefitCardSkeleton,
} from "@/components/campus/BenefitCard";
import { CampusFormSelect } from "@/components/campus/CampusFormSelect";
import { LText } from "@/components/lister/Typography";
import { SegmentedPillTrack } from "@/components/listings/SegmentedPillTrack";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  BENEFIT_CATEGORY_ORDER,
  categoryMeta,
} from "@/features/benefits/categories";
import { isCampusExclusive, type BenefitCategory } from "@/features/benefits/types";
import { errorStatus, useBenefits } from "@/features/benefits/useBenefits";
import { useCampusInstitutions } from "@/features/campus/useCampusInstitutions";

type Scope = "all" | "lebanon" | "global";

const ALL_UNIS = "";

const SCOPE_OPTIONS = [
  { value: "all" as const, label: "All offers" },
  { value: "lebanon" as const, label: "In Lebanon" },
  { value: "global" as const, label: "Global" },
];

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseScope(value: string | string[] | undefined): Scope {
  const raw = paramStr(value);
  return raw === "lebanon" || raw === "global" ? raw : "all";
}

function parseCategory(
  value: string | string[] | undefined,
): BenefitCategory | "" {
  const raw = paramStr(value) as BenefitCategory;
  return BENEFIT_CATEGORY_ORDER.includes(raw) ? raw : "";
}

const SCOPE_TO_IS_GLOBAL: Record<Scope, boolean | undefined> = {
  all: undefined,
  lebanon: false,
  global: true,
};

export function StudentBenefitsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    uni?: string;
    cat?: string;
    scope?: string;
  }>();
  const { width } = useWindowDimensions();
  const { user } = useAuthSession();
  const institutions = useCampusInstitutions();

  const [query, setQuery] = useState(paramStr(params.q));
  const [uni, setUni] = useState(
    paramStr(params.uni) || user?.campus?.institutionShortName || ALL_UNIS,
  );
  const [category, setCategory] = useState<BenefitCategory | "">(
    parseCategory(params.cat),
  );
  const [scope, setScope] = useState<Scope>(parseScope(params.scope));

  const columns = width >= 1100 ? 3 : width >= 720 ? 2 : 1;

  const syncParams = useCallback(
    (next: {
      q?: string;
      uni?: string;
      cat?: BenefitCategory | "";
      scope?: Scope;
    }) => {
      const nextScope = next.scope ?? scope;
      router.setParams({
        q: (next.q ?? query).trim() || undefined,
        uni: (next.uni ?? uni) || undefined,
        cat: (next.cat ?? category) || undefined,
        scope: nextScope === "all" ? undefined : nextScope,
      } as never);
    },
    [router, query, uni, category, scope],
  );

  const benefits = useBenefits({
    university: uni || undefined,
    category: category || undefined,
    isGlobal: SCOPE_TO_IS_GLOBAL[scope],
  });

  const uniOptions = useMemo(() => {
    const rows = [
      { value: ALL_UNIS, label: "All universities" },
      ...(institutions.data ?? []).map((row) => ({
        value: row.shortName,
        label: row.shortName,
        detail: row.name,
      })),
    ];
    // A deep-linked acronym has to stay selectable before the catalog lands,
    // otherwise CampusFormSelect treats "All universities" as the only option
    // and resets the filter out from under the URL.
    if (uni && !rows.some((row) => row.value === uni)) {
      rows.push({ value: uni, label: uni });
    }
    return rows;
  }, [institutions.data, uni]);

  // The list endpoint returns every active offer in one response, so matching
  // on company/title here beats a round-trip per keystroke.
  const searched = useMemo(() => {
    const rows = benefits.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.companyName.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q),
    );
  }, [benefits.data, query]);

  const { exclusive, open } = useMemo(() => {
    const ex = searched.filter(isCampusExclusive);
    return {
      exclusive: ex,
      open: searched.filter((row) => !isCampusExclusive(row)),
    };
  }, [searched]);

  const openDetail = useCallback(
    (id: string) => {
      router.push(`/campus/benefits/${id}` as never);
    },
    [router],
  );

  const clearFilters = () => {
    setQuery("");
    setUni(ALL_UNIS);
    setCategory("");
    setScope("all");
    router.setParams({
      q: undefined,
      uni: undefined,
      cat: undefined,
      scope: undefined,
    } as never);
  };

  const unknownUniversity = errorStatus(benefits.error) === 404;
  const hasFilters = Boolean(query.trim() || uni || category || scope !== "all");

  const renderGrid = (rows: typeof searched, offset: number) => (
    <View style={styles.grid}>
      {rows.map((benefit, i) => (
        <View
          key={benefit.id}
          style={[styles.cell, { flexBasis: `${100 / columns}%` }]}
        >
          <BenefitCard
            benefit={benefit}
            index={offset + i}
            onPress={openDetail}
          />
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroRule} />
          <LText variant="label" tone="muted" style={styles.kicker}>
            Student benefits · Lebanon
          </LText>
          <LText variant="display" style={styles.title}>
            Perks you already qualify for
          </LText>
          <LText variant="body" tone="muted" style={styles.lede}>
            Verified student discounts on software, food, transport, and
            telecom — plus offers exclusive to your campus.
          </LText>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Skoun.color.inkMuted} />
          <TextInput
            value={query}
            onChangeText={(next) => {
              setQuery(next);
              syncParams({ q: next });
            }}
            placeholder="Search a brand or offer — Spotify, Zomato, Alfa…"
            placeholderTextColor={Skoun.color.inkFaint}
            accessibilityLabel="Search student benefits"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery("");
                syncParams({ q: "" });
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearBtn}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={Skoun.color.inkMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.filterRow, columns === 1 && styles.filterRowStack]}>
          <View style={styles.uniField}>
            <CampusFormSelect
              label="University"
              value={uni}
              options={uniOptions}
              disabled={institutions.isLoading}
              searchable
              searchPlaceholder="Search universities…"
              accessibilityLabel="Filter by university"
              onChange={(next) => {
                setUni(next);
                syncParams({ uni: next });
              }}
            />
          </View>
          <View style={styles.scopeField}>
            <LText variant="label" tone="muted" style={styles.fieldLabel}>
              Availability
            </LText>
            <SegmentedPillTrack
              value={scope}
              options={SCOPE_OPTIONS}
              accessibilityLabel="Filter by availability"
              fill
              onChange={(next) => {
                setScope(next);
                syncParams({ scope: next });
              }}
            />
          </View>
        </View>

        <View style={styles.chipRow}>
          <Pressable
            onPress={() => {
              setCategory("");
              syncParams({ cat: "" });
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: category === "" }}
            accessibilityLabel="All categories"
            style={({ hovered }) => [
              styles.chip,
              category === "" && styles.chipOn,
              hovered && category !== "" && styles.chipHover,
            ]}
          >
            <LText
              variant="caption"
              style={[styles.chipLabel, category === "" && styles.chipLabelOn]}
            >
              All
            </LText>
          </Pressable>

          {BENEFIT_CATEGORY_ORDER.map((key) => {
            const meta = categoryMeta(key);
            const on = category === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  const next = on ? "" : key;
                  setCategory(next);
                  syncParams({ cat: next });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${meta.label} offers`}
                style={({ hovered }) => [
                  styles.chip,
                  on && { backgroundColor: meta.accent, borderColor: meta.accent },
                  hovered && !on && styles.chipHover,
                ]}
              >
                <Ionicons
                  name={meta.icon}
                  size={14}
                  color={on ? Skoun.color.surface : meta.accent}
                />
                <LText
                  variant="caption"
                  style={[styles.chipLabel, on && styles.chipLabelOn]}
                >
                  {meta.label}
                </LText>
              </Pressable>
            );
          })}
        </View>

        {benefits.isLoading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[styles.cell, { flexBasis: `${100 / columns}%` }]}
              >
                <BenefitCardSkeleton />
              </View>
            ))}
          </View>
        ) : unknownUniversity ? (
          <WebEmptyState
            icon="school-outline"
            title="No offers for that university yet"
            message="We don't have this campus in the benefits registry. Try browsing every university instead."
            actionLabel="Show all universities"
            onAction={clearFilters}
          />
        ) : benefits.isError ? (
          <WebEmptyState
            icon="cloud-offline-outline"
            title="Couldn't load benefits"
            message="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => void benefits.refetch()}
          />
        ) : searched.length === 0 ? (
          <WebEmptyState
            icon="pricetag-outline"
            title="No offers match"
            message={
              hasFilters
                ? "Try a different category, or clear your filters to see everything."
                : "No student benefits are live right now — check back soon."
            }
            actionLabel={hasFilters ? "Clear filters" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <View style={styles.results}>
            <LText variant="caption" tone="muted" style={styles.count}>
              {searched.length} {searched.length === 1 ? "offer" : "offers"}
              {uni ? ` for ${uni} students` : " across Lebanon"}
            </LText>

            {exclusive.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <LText variant="subtitle" style={styles.sectionTitle}>
                    {uni ? `Exclusive to ${uni}` : "Campus exclusives"}
                  </LText>
                  <LText variant="caption" tone="muted">
                    Not available anywhere else
                  </LText>
                </View>
                {renderGrid(exclusive, 0)}
              </View>
            ) : null}

            {open.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <LText variant="subtitle" style={styles.sectionTitle}>
                    Open to all students in Lebanon
                  </LText>
                  <LText variant="caption" tone="muted">
                    Any accredited university
                  </LText>
                </View>
                {renderGrid(open, exclusive.length)}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 64,
  },
  page: {
    gap: 24,
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center",
  },
  hero: {
    gap: 10,
    maxWidth: 640,
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
    paddingTop: 8,
  },
  heroRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Skoun.color.primary,
    marginBottom: 2,
  },
  kicker: {
    letterSpacing: 0.6,
    textAlign: "center",
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
    textAlign: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    minHeight: 60,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1.5,
    borderColor: Skoun.color.border,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 4px 16px rgba(18, 24, 38, 0.06)" } as object)
      : null),
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    color: Skoun.color.ink,
    padding: 0,
    ...(Platform.OS === "web"
      ? ({ outlineStyle: "none" } as object)
      : null),
  },
  clearBtn: {
    padding: 2,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    width: "100%",
  },
  filterRowStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  uniField: {
    flex: 1,
    minWidth: 0,
  },
  scopeField: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  fieldLabel: {
    letterSpacing: 0.35,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, border-color",
          transitionDuration: "180ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  chipOn: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  chipHover: {
    borderColor: Skoun.color.borderStrong,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  chipLabel: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  chipLabelOn: {
    color: Skoun.color.surface,
    fontFamily: Skoun.type.bodySemi,
  },
  results: {
    gap: 28,
    width: "100%",
  },
  count: {
    fontFamily: Skoun.type.bodyMedium,
  },
  section: {
    gap: 14,
  },
  sectionHead: {
    gap: 2,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    rowGap: 16,
  },
  cell: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 8,
  },
});
