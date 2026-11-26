import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Lister } from "@/constants/listerTheme";
import {
  useInstitutions,
  type Institution,
} from "@/features/universities/useInstitutions";
import type { University } from "@/features/universities/useUniversities";

type Props = {
  selectedCampusId: string | null;
  onSelectCampusId: (id: string) => void;
  invalid?: boolean;
  variant?: "classic" | "refined";
  walkLabel?: string | null;
};

type CampusRow = {
  inst: Institution;
  campus: University;
};

function campusLocation(campus: University): string {
  return (campus.city ?? campus.name).trim();
}

function campusMatches(campus: University, inst: Institution, q: string): boolean {
  return (
    inst.name.toLowerCase().includes(q) ||
    inst.shortName.toLowerCase().includes(q) ||
    campus.name.toLowerCase().includes(q) ||
    (campus.displayName ?? "").toLowerCase().includes(q) ||
    campusLocation(campus).toLowerCase().includes(q)
  );
}

export function WizardCampusSearch({
  selectedCampusId,
  onSelectCampusId,
  invalid,
  variant = "classic",
  walkLabel = null,
}: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  const catalog = useInstitutions();
  const institutions = catalog.data ?? [];
  const [query, setQuery] = useState("");

  const selectedEntry = useMemo<CampusRow | null>(() => {
    if (!selectedCampusId) return null;
    for (const inst of institutions) {
      const campus = inst.campuses.find((c) => c.id === selectedCampusId);
      if (campus) return { inst, campus };
    }
    return null;
  }, [institutions, selectedCampusId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: CampusRow[] = [];
    for (const inst of institutions) {
      for (const campus of inst.campuses) {
        if (!q || campusMatches(campus, inst, q)) {
          out.push({ inst, campus });
        }
      }
    }
    return out;
  }, [institutions, query]);

  if (catalog.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Lister.color.primary} />
      </View>
    );
  }

  if (catalog.isError) {
    return (
      <View style={styles.center}>
        <LText variant="caption" tone="muted">
          Couldn’t load campuses.
        </LText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void catalog.refetch()}
          style={styles.retry}
        >
          <LText variant="caption" tone="primary" style={styles.retryText}>
            Retry
          </LText>
        </Pressable>
      </View>
    );
  }

  if (variant === "refined") {
    const selectedLabel = selectedEntry
      ? selectedEntry.inst.shortName
        ? `${selectedEntry.inst.shortName} · ${campusLocation(selectedEntry.campus)}`
        : campusLocation(selectedEntry.campus)
      : "";
    const listRows =
      !query.trim() && selectedEntry
        ? rows.filter(({ campus }) => campus.id !== selectedCampusId)
        : rows;

    return (
      <View style={[styles.refinedShell, invalid && styles.shellInvalid]}>
        {selectedEntry ? (
          <View
            style={styles.selectedBanner}
            accessibilityRole="radio"
            accessibilityState={{ checked: true }}
            accessibilityLabel={selectedLabel}
          >
            <InstitutionLogo
              slug={selectedEntry.inst.slug}
              shortName={selectedEntry.inst.shortName}
              website={selectedEntry.inst.website}
              logoUrl={selectedEntry.inst.logoUrl}
              size={designSize(32)}
            />
            <View style={styles.rowText}>
              <LText variant="caption" style={styles.selectedTitle}>
                {selectedEntry.inst.name}
              </LText>
              <View style={styles.selectedMetaRow}>
                <LText variant="caption" tone="muted">
                  {selectedLabel}
                </LText>
                {walkLabel ? (
                  <View style={styles.walkPill}>
                    <Ionicons
                      name="walk-outline"
                      size={designSize(12)}
                      color={Lister.color.ink}
                    />
                    <LText variant="caption" style={styles.walkPillText}>
                      {walkLabel}
                    </LText>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.refinedCheckOn}>
              <Ionicons
                name="checkmark"
                size={designSize(12)}
                color={Lister.color.surface}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.refinedSearchRow}>
          <Ionicons name="search" size={designSize(15)} color={Lister.color.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              selectedEntry ? "Switch university or campus" : "Search university or campus"
            }
            placeholderTextColor={Lister.color.inkFaint}
            style={styles.refinedSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search university or campus"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={designSize(16)} color={Lister.color.inkFaint} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.refinedList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {listRows.length === 0 ? (
            <LText variant="caption" tone="muted" style={styles.empty}>
              No campuses match “{query.trim()}”.
            </LText>
          ) : (
            listRows.map(({ inst, campus }, idx) => {
              const on = campus.id === selectedCampusId;
              const location = campusLocation(campus);
              const label = inst.shortName
                ? `${inst.shortName} · ${location}`
                : location;
              return (
                <Pressable
                  key={campus.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={label}
                  onPress={() => onSelectCampusId(campus.id)}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.refinedRow,
                    idx > 0 && styles.refinedRowDivided,
                    hovered && !on && styles.refinedRowHover,
                    on && styles.refinedRowOn,
                  ]}
                >
                  <InstitutionLogo
                    slug={inst.slug}
                    shortName={inst.shortName}
                    website={inst.website}
                    logoUrl={inst.logoUrl}
                    size={designSize(30)}
                  />
                  <View style={styles.rowText}>
                    <LText variant="caption" style={styles.refinedRowTitle}>
                      {inst.name}
                    </LText>
                    <LText variant="caption" tone="muted" style={styles.refinedRowSub}>
                      {label}
                    </LText>
                  </View>
                  <View style={[styles.refinedRadio, on && styles.refinedCheckOn]}>
                    {on ? (
                      <Ionicons
                        name="checkmark"
                        size={designSize(12)}
                        color={Lister.color.surface}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.shell, invalid && styles.shellInvalid]}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={designSize(16)} color={Lister.color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search university or campus"
          placeholderTextColor={Lister.color.inkFaint}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search university or campus"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={designSize(16)} color={Lister.color.inkFaint} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        style={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {rows.length === 0 ? (
          <LText variant="caption" tone="muted" style={styles.empty}>
            No campuses match “{query.trim()}”.
          </LText>
        ) : (
          rows.map(({ inst, campus }) => {
            const on = campus.id === selectedCampusId;
            const location = campusLocation(campus);
            const label = inst.shortName
              ? `${inst.shortName} · ${location}`
              : location;
            return (
              <Pressable
                key={campus.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
                onPress={() => onSelectCampusId(campus.id)}
                style={[styles.row, on && styles.rowOn]}
              >
                <InstitutionLogo
                  slug={inst.slug}
                  shortName={inst.shortName}
                  website={inst.website}
                  logoUrl={inst.logoUrl}
                  size={designSize(32)}
                />
                <View style={styles.rowText}>
                  <LText variant="caption" style={on ? styles.titleOn : styles.title}>
                    {inst.name}
                  </LText>
                  <LText variant="caption" tone="muted">
                    {label}
                  </LText>
                </View>
                {on ? (
                  <Ionicons
                    name="checkmark"
                    size={designSize(16)}
                    color={Lister.color.primary}
                  />
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  center: { paddingVertical: 20, alignItems: "center", gap: 8 },
  retry: { paddingVertical: 6, paddingHorizontal: 4 },
  retryText: { fontFamily: Lister.type.bodySemi },
  shell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  shellInvalid: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  search: {
    flex: 1,
    minWidth: 0,
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
    paddingVertical: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  list: { maxHeight: 280 },
  empty: { paddingHorizontal: 14, paddingVertical: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowOn: { backgroundColor: Lister.color.primaryMist },
  rowText: { flex: 1, gap: 2 },
  title: {
    color: Lister.color.ink,
    fontFamily: Lister.type.bodySemi,
  },
  titleOn: {
    color: Lister.color.primaryDeep,
    fontFamily: Lister.type.bodySemi,
  },
  /* Refined variant */
  refinedShell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 12,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  selectedTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  selectedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  walkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Lister.color.bgWash,
  },
  walkPillText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 11.5,
    lineHeight: 15,
    color: Lister.color.ink,
  },
  refinedSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  refinedSearch: {
    flex: 1,
    minWidth: 0,
    fontFamily: Lister.type.body,
    fontSize: 14,
    color: Lister.color.ink,
    paddingVertical: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  refinedList: { maxHeight: 236 },
  refinedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: Lister.color.surface,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  refinedRowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  refinedRowHover: {
    backgroundColor: Lister.color.bg,
  },
  refinedRowOn: {
    backgroundColor: Lister.color.bg,
  },
  refinedRowTitle: {
    color: Lister.color.ink,
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
  },
  refinedRowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  refinedRadio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  refinedCheckOn: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
