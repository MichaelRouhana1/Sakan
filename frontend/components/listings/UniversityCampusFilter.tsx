import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
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
};

function UniLogo({
  shortName,
  logoUrl,
}: {
  shortName: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={styles.logo} />;
  }
  return (
    <View style={styles.logoFallback}>
      <LText variant="caption" style={styles.logoFallbackText}>
        {shortName.slice(0, 3)}
      </LText>
    </View>
  );
}

export function UniversityCampusFilter({
  selectedCampusSlug,
  onSelectCampusSlug,
  selectedInstitutionSlug,
  onSelectInstitutionSlug,
  hideHeading,
}: Props) {
  const catalog = useInstitutions();
  const institutions = catalog.data ?? [];
  const [query, setQuery] = useState("");
  const [localInstSlug, setLocalInstSlug] = useState<string | null>(null);

  const derivedFromCampus = useMemo(() => {
    if (!selectedCampusSlug) return null;
    return (
      institutions.find((i) =>
        i.campuses.some((c) => c.slug === selectedCampusSlug),
      ) ?? null
    );
  }, [institutions, selectedCampusSlug]);

  const pickedInstSlug =
    selectedInstitutionSlug !== undefined
      ? selectedInstitutionSlug || derivedFromCampus?.slug || null
      : localInstSlug || derivedFromCampus?.slug || null;

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.slug === pickedInstSlug) ?? null,
    [institutions, pickedInstSlug],
  );

  const filteredUnis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q),
    );
  }, [institutions, query]);

  const setInstitution = (slug: string | null) => {
    setLocalInstSlug(slug);
    onSelectInstitutionSlug?.(slug);
  };

  const pickInstitution = (inst: Institution) => {
    setQuery("");
    setInstitution(inst.slug);
    const stillValid = inst.campuses.some((c) => c.slug === selectedCampusSlug);
    if (!stillValid) onSelectCampusSlug(null);
  };

  const changeUniversity = () => {
    setInstitution(null);
    onSelectCampusSlug(null);
  };

  if (catalog.isLoading) {
    return <ActivityIndicator color={Skoun.color.primary} />;
  }

  if (selectedInstitution) {
    return (
      <View>
        {hideHeading ? null : (
          <LText variant="label" tone="muted" style={styles.sectionLabel}>
            Campus
          </LText>
        )}
        <View style={styles.pickedUni}>
          <UniLogo
            shortName={selectedInstitution.shortName}
            logoUrl={selectedInstitution.logoUrl}
          />
          <View style={styles.rowText}>
            <LText variant="caption" style={styles.rowTitle}>
              {selectedInstitution.name}
            </LText>
            <LText variant="caption" tone="muted">
              {selectedInstitution.shortName}
            </LText>
          </View>
        </View>
        <LText variant="caption" tone="muted" style={styles.hint}>
          Pick a campus to search near.
        </LText>
        {selectedInstitution.campuses.map((campus) => {
          const on = selectedCampusSlug === campus.slug;
          return (
            <Pressable
              key={campus.slug}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onSelectCampusSlug(on ? null : campus.slug)}
              style={[styles.row, on && styles.rowOn]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={on ? Skoun.color.primary : Skoun.color.ink}
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
        })}
        <Pressable onPress={changeUniversity} style={styles.back}>
          <Ionicons name="arrow-back" size={16} color={Skoun.color.primary} />
          <LText variant="caption" style={styles.backText}>
            Change university
          </LText>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {hideHeading ? null : (
        <LText variant="label" tone="muted" style={styles.sectionLabel}>
          University
        </LText>
      )}
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
      <View style={styles.list}>
        {filteredUnis.map((inst) => (
          <Pressable
            key={inst.id}
            accessibilityRole="button"
            onPress={() => pickInstitution(inst)}
            style={styles.row}
          >
            <UniLogo shortName={inst.shortName} logoUrl={inst.logoUrl} />
            <View style={styles.rowText}>
              <LText variant="caption" style={styles.rowTitle}>
                {inst.name}
              </LText>
              <LText variant="caption" tone="muted">
                {inst.shortName}
                {inst.campuses.length > 1
                  ? ` · ${inst.campuses.length} campuses`
                  : ""}
              </LText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Skoun.color.inkFaint}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 8,
    textTransform: "uppercase",
  },
  hint: { marginBottom: 8 },
  search: {
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: Skoun.color.ink,
  },
  list: { gap: 2 },
  pickedUni: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  rowOn: { backgroundColor: Skoun.color.primaryMist },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: Skoun.color.ink, fontWeight: "600" },
  rowTitleOn: { color: Skoun.color.primary, fontWeight: "700" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  backText: { color: Skoun.color.primary, fontWeight: "600" },
  logo: { width: 32, height: 32, borderRadius: 8 },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 10,
  },
});
