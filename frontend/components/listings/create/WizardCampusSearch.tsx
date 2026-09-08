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
}: Props) {
  const catalog = useInstitutions();
  const institutions = catalog.data ?? [];
  const [query, setQuery] = useState("");

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

  return (
    <View style={[styles.shell, invalid && styles.shellInvalid]}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Lister.color.inkFaint} />
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
            <Ionicons name="close-circle" size={16} color={Lister.color.inkFaint} />
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
                  size={32}
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
                    size={16}
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

const styles = StyleSheet.create({
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
});
