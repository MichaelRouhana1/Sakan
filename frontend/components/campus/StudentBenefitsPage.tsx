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

  const columns = width >= 1500 ? 4 : width >= 980 ? 3 : width >= 640 ? 2 : 1;
  const compact = width < 640;
  const pagePadX = compact ? 16 : width < 900 ? 24 : 48;

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
        slug: row.slug,
        logoUrl: row.logoUrl,
        website: row.website,
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

  const countLabel = `${searched.length} ${searched.length === 1 ? "offer" : "offers"}${
    uni ? ` for ${uni} students` : " across Lebanon"
  }`;

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

  const pageInner = (
      <View
        style={[
          styles.page,
          Platform.OS === "web"
            ? ({
                width: "100vw",
                maxWidth: "100vw",
                marginLeft: "calc(50% - 50vw)",
                paddingHorizontal: pagePadX,
                boxSizing: "border-box",
              } as object)
            : { paddingHorizontal: 12 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroRule} />
          <LText variant="label" tone="muted" style={styles.kicker}>
            Student benefits
          </LText>
          <LText
            variant="display"
            style={[styles.title, compact && styles.titleCompact]}
          >
            Perks you already qualify for
          </LText>
        </View>

        <View style={[styles.searchWrap, compact && styles.searchWrapCompact]}>
          <Ionicons name="search" size={18} color={Skoun.color.inkMuted} />
          <TextInput
            value={query}
            onChangeText={(next) => {
              setQuery(next);
              syncParams({ q: next });
            }}
            placeholder={
              compact
                ? "Search Spotify, Alfa, food…"
                : "Search a brand or offer — Spotify, Zomato, Alfa…"
            }
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
              hitSlop={8}
              style={styles.clearBtn}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Skoun.color.inkMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.filterRail, columns === 1 && styles.filterRailStack]}>
          <View style={[styles.railBlock, styles.railUni]}>
            <LText variant="label" tone="muted" style={styles.railEyebrow}>
              Studying at
            </LText>
            <CampusFormSelect
              appearance="passport"
              hideLabel
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

          <View
            style={[
              styles.railBlock,
              styles.railScope,
              columns === 1 && styles.railScopeStack,
            ]}
          >
            <LText variant="label" tone="muted" style={styles.railEyebrow}>
              Show
            </LText>
            <View
              style={[styles.scopeTabs, columns === 1 && styles.scopeTabsWrap]}
              accessibilityRole="tablist"
              accessibilityLabel="Filter by availability"
            >
              {SCOPE_OPTIONS.map((opt) => {
                const on = scope === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setScope(opt.value);
                      syncParams({ scope: opt.value });
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={opt.label}
                    style={({ hovered }) => [
                      styles.scopeTab,
                      hovered && !on && styles.scopeTabHover,
                    ]}
                  >
                    <LText
                      variant="body"
                      style={[styles.scopeTabLabel, on && styles.scopeTabLabelOn]}
                    >
                      {opt.label}
                    </LText>
                    <View
                      style={[styles.scopeUnderline, on && styles.scopeUnderlineOn]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.railBlock, styles.railBrowse]}>
            <LText variant="label" tone="muted" style={styles.railEyebrow}>
              Browse
            </LText>
            <View
              style={styles.catRow}
              accessibilityRole="tablist"
              accessibilityLabel="Filter by category"
            >
              <Pressable
                onPress={() => {
                  setCategory("");
                  syncParams({ cat: "" });
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: category === "" }}
                accessibilityLabel="All categories"
                hitSlop={6}
                style={({ hovered, pressed }) => [
                  styles.catItem,
                  (hovered || pressed) && category !== "" && styles.catItemHover,
                ]}
              >
                <View style={styles.catItemInner}>
                  <View
                    style={[
                      styles.catMark,
                      category === "" && styles.catMarkOnPrimary,
                    ]}
                  >
                    <Ionicons
                      name="apps-outline"
                      size={14}
                      color={
                        category === ""
                          ? Skoun.color.surface
                          : Skoun.color.primary
                      }
                    />
                  </View>
                  <LText
                    variant="body"
                    style={[
                      styles.catLabel,
                      category === "" && styles.catLabelOn,
                    ]}
                  >
                    All
                  </LText>
                </View>
                <View
                  style={[
                    styles.catUnderline,
                    category === "" && styles.catUnderlineOn,
                  ]}
                />
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
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${meta.label} offers`}
                    hitSlop={6}
                    style={({ hovered, pressed }) => [
                      styles.catItem,
                      (hovered || pressed) && !on && styles.catItemHover,
                    ]}
                  >
                    <View style={styles.catItemInner}>
                      <View
                        style={[
                          styles.catMark,
                          { backgroundColor: meta.tint },
                          on && { backgroundColor: meta.accent },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon}
                          size={14}
                          color={on ? Skoun.color.surface : meta.accent}
                        />
                      </View>
                      <LText
                        variant="body"
                        style={[styles.catLabel, on && styles.catLabelOn]}
                      >
                        {meta.label}
                      </LText>
                    </View>
                    <View
                      style={[
                        styles.catUnderline,
                        on && { backgroundColor: meta.accent },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
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
            {exclusive.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionTitleRow}>
                    <LText variant="subtitle" style={styles.sectionTitle}>
                      {uni ? `Exclusive to ${uni}` : "Campus exclusives"}
                    </LText>
                    <LText variant="caption" tone="muted" style={styles.count}>
                      {countLabel}
                    </LText>
                  </View>
                  <LText
                    variant="caption"
                    tone="muted"
                    style={styles.sectionSub}
                  >
                    Not available anywhere else
                  </LText>
                </View>
                {renderGrid(exclusive, 0)}
              </View>
            ) : null}

            {open.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionTitleRow}>
                    <LText variant="subtitle" style={styles.sectionTitle}>
                      Open to all students in Lebanon
                    </LText>
                    {exclusive.length === 0 ? (
                      <LText variant="caption" tone="muted" style={styles.count}>
                        {countLabel}
                      </LText>
                    ) : null}
                  </View>
                  <LText
                    variant="caption"
                    tone="muted"
                    style={styles.sectionSub}
                  >
                    Any accredited university
                  </LText>
                </View>
                {renderGrid(open, exclusive.length)}
              </View>
            ) : null}
          </View>
        )}
      </View>
  );

  if (Platform.OS === "web") {
    return pageInner;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {pageInner}
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
    alignSelf: "stretch",
    minWidth: 0,
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
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
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
  searchWrapCompact: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    color: Skoun.color.ink,
    padding: 0,
    minWidth: 0,
    ...(Platform.OS === "web"
      ? ({ outlineStyle: "none" } as object)
      : null),
  },
  clearBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  filterRail: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    columnGap: 28,
    rowGap: 16,
    width: "100%",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterRailStack: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
    paddingBottom: 14,
  },
  railBlock: {
    gap: 4,
    justifyContent: "flex-start",
    minWidth: 0,
  },
  railUni: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "100%",
  },
  railScope: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "100%",
  },
  railScopeStack: {
    alignItems: "flex-start",
  },
  railBrowse: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 320,
    minWidth: 0,
  },
  railEyebrow: {
    letterSpacing: 0.8,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    marginBottom: 0,
  },
  scopeTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
  },
  scopeTabsWrap: {
    flexWrap: "wrap",
    rowGap: 4,
  },
  scopeTab: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    minHeight: 44,
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  scopeTabHover: {
    opacity: 0.75,
  },
  scopeTabLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
  },
  scopeTabLabelOn: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  scopeUnderline: {
    marginTop: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  scopeUnderlineOn: {
    backgroundColor: Skoun.color.primary,
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 4,
    rowGap: 6,
    width: "100%",
    minHeight: 44,
  },
  catItem: {
    alignItems: "stretch",
    paddingHorizontal: 8,
    paddingTop: 4,
    minHeight: 44,
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "opacity",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  catItemHover: {
    opacity: 0.72,
  },
  catItemInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingBottom: 4,
    minHeight: 32,
  },
  catMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "background-color",
          transitionDuration: "180ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  catMarkOnPrimary: {
    backgroundColor: Skoun.color.primary,
  },
  catLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  catLabelOn: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  catUnderline: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  catUnderlineOn: {
    backgroundColor: Skoun.color.primary,
  },
  results: {
    gap: 28,
    width: "100%",
  },
  count: {
    fontFamily: Skoun.type.bodyMedium,
    flexShrink: 0,
  },
  section: {
    gap: 14,
  },
  sectionHead: {
    gap: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: 10,
    rowGap: 2,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  sectionSub: {
    flexShrink: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    rowGap: 14,
    width: "100%",
  },
  cell: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 6,
    alignSelf: "stretch",
    minWidth: 0,
    maxWidth: "100%",
  },
});