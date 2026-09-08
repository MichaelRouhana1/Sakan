import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import {
  useInstitutions,
  type Institution,
} from "@/features/universities/useInstitutions";

type Props = {
  selectedCampusSlug: string | null;
  onSelectCampusSlug: (slug: string | null) => void;
  /** Institution slug kept while user still picking a campus. */
  selectedInstitutionSlug?: string | null;
  onSelectInstitutionSlug?: (slug: string | null) => void;
  hideHeading?: boolean;
  /** Called when the compact All control is pressed. Defaults to clearing campus. */
  onSelectAll?: () => void;
};

function institutionSubtitle(inst: Institution): string {
  const campusNote =
    inst.campuses.length > 1 ? ` · ${inst.campuses.length} campuses` : "";
  return `${inst.shortName}${campusNote}`;
}

export function UniversityCampusFilter({
  selectedCampusSlug,
  onSelectCampusSlug,
  selectedInstitutionSlug,
  onSelectInstitutionSlug,
  hideHeading,
  onSelectAll,
}: Props) {
  const catalog = useInstitutions();
  const institutions = catalog.data ?? [];
  const [query, setQuery] = useState("");
  /** undefined = follow the selected campus; string/null = user toggle. */
  const [expandedSlug, setExpandedSlug] = useState<string | null | undefined>(
    undefined,
  );

  const derivedFromCampus = useMemo(() => {
    if (!selectedCampusSlug) return null;
    return (
      institutions.find((i) =>
        i.campuses.some((c) => c.slug === selectedCampusSlug),
      ) ?? null
    );
  }, [institutions, selectedCampusSlug]);

  const expandedInstSlug =
    expandedSlug === undefined
      ? derivedFromCampus?.slug ?? selectedInstitutionSlug ?? null
      : expandedSlug;

  const filteredUnis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.campuses.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.city ?? "").toLowerCase().includes(q),
        ),
    );
  }, [institutions, query]);

  const pickCampus = (inst: Institution, campusSlug: string | null) => {
    onSelectInstitutionSlug?.(campusSlug ? inst.slug : null);
    onSelectCampusSlug(campusSlug);
  };

  const pickInstitution = (inst: Institution) => {
    if (inst.campuses.length <= 1) {
      const slug = inst.campuses[0]?.slug ?? null;
      const alreadyOn = slug != null && selectedCampusSlug === slug;
      pickCampus(inst, alreadyOn ? null : slug);
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug((prev) => {
      const current =
        prev === undefined
          ? derivedFromCampus?.slug ?? selectedInstitutionSlug ?? null
          : prev;
      return current === inst.slug ? null : inst.slug;
    });
  };

  const allSelected = selectedCampusSlug == null;

  const selectAll = () => {
    if (onSelectAll) {
      onSelectAll();
      return;
    }
    onSelectInstitutionSlug?.(null);
    onSelectCampusSlug(null);
  };

  if (catalog.isLoading) {
    return <ActivityIndicator color={Skoun.color.primary} />;
  }

  return (
    <View>
      {hideHeading ? null : (
        <LText variant="label" tone="muted" style={styles.sectionLabel}>
          University
        </LText>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search university…"
          placeholderTextColor={Skoun.color.inkFaint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search universities"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: allSelected }}
          accessibilityLabel="All universities"
          onPress={selectAll}
          style={[styles.allBtn, allSelected && styles.allBtnOn]}
        >
          <LText
            variant="caption"
            style={allSelected ? styles.allLabelOn : styles.allLabel}
          >
            All
          </LText>
        </Pressable>
      </View>
      <View style={styles.list}>
        {filteredUnis.map((inst) => {
          const multi = inst.campuses.length > 1;
          const expanded = multi && expandedInstSlug === inst.slug;
          const selectedHere = inst.campuses.some(
            (c) => c.slug === selectedCampusSlug,
          );
          return (
            <View key={inst.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: multi ? expanded : undefined }}
                onPress={() => pickInstitution(inst)}
                style={[styles.row, selectedHere && styles.rowOn]}
              >
                <InstitutionLogo
                  slug={inst.slug}
                  shortName={inst.shortName}
                  website={inst.website}
                  logoUrl={inst.logoUrl}
                />
                <View style={styles.rowText}>
                  <LText
                    variant="caption"
                    style={selectedHere ? styles.rowTitleOn : styles.rowTitle}
                  >
                    {inst.name}
                  </LText>
                  <LText variant="caption" tone="muted">
                    {institutionSubtitle(inst)}
                  </LText>
                </View>
                {multi ? (
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={
                      selectedHere ? Skoun.color.primary : Skoun.color.inkFaint
                    }
                  />
                ) : selectedHere ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={Skoun.color.primary}
                  />
                ) : null}
              </Pressable>
              {expanded
                ? inst.campuses.map((campus) => {
                    const on = selectedCampusSlug === campus.slug;
                    return (
                      <Pressable
                        key={campus.slug}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() =>
                          pickCampus(inst, on ? null : campus.slug)
                        }
                        style={[styles.campusRow, on && styles.rowOn]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={on ? Skoun.color.primary : Skoun.color.inkMuted}
                        />
                        <View style={styles.rowText}>
                          <LText
                            variant="caption"
                            style={on ? styles.rowTitleOn : styles.rowTitle}
                          >
                            {campus.name}
                          </LText>
                          {campus.city ? (
                            <LText variant="caption" tone="muted">
                              {campus.city}
                            </LText>
                          ) : null}
                        </View>
                        {on ? (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={Skoun.color.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })
                : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 8,
    textTransform: "uppercase",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Skoun.color.ink,
  },
  allBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  allBtnOn: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primary,
  },
  allLabel: {
    color: Skoun.color.ink,
    fontWeight: "600",
  },
  allLabelOn: {
    color: Skoun.color.primary,
    fontWeight: "700",
  },
  list: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  campusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingRight: 6,
    paddingLeft: 44,
    borderRadius: 10,
  },
  rowOn: { backgroundColor: Skoun.color.primaryMist },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: Skoun.color.ink, fontWeight: "600" },
  rowTitleOn: { color: Skoun.color.primary, fontWeight: "700" },
});
