import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import {
  POPULAR_INSTITUTION_SLUGS,
  useInstitutions,
  type Institution,
} from "@/features/universities/useInstitutions";
import type { University } from "@/features/universities/useUniversities";

type Props = {
  selectedCampusId: string | null;
  onSelectCampus: (campus: University, institution: Institution) => void;
  title?: string;
};

export function InstitutionCampusPicker({
  selectedCampusId,
  onSelectCampus,
  title = "Where do you study?",
}: Props) {
  const catalog = useInstitutions();
  const [query, setQuery] = useState("");
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  const institutions = catalog.data ?? [];
  const selectedInstitution =
    institutions.find((i) => i.id === institutionId) ?? null;

  const filtered = useMemo(() => {
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

  const popular = useMemo(
    () =>
      institutions.filter((inst) =>
        (POPULAR_INSTITUTION_SLUGS as readonly string[]).includes(inst.slug),
      ),
    [institutions],
  );

  const pickInstitution = (inst: Institution) => {
    if (inst.campuses.length === 1) {
      onSelectCampus(inst.campuses[0], inst);
      setInstitutionId(inst.id);
      return;
    }
    setInstitutionId(inst.id);
  };

  if (catalog.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Skoun.color.primary} />
      </View>
    );
  }

  if (catalog.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Couldn’t load universities. Try again.</Text>
        <Pressable
          onPress={() => void catalog.refetch()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (selectedInstitution && selectedInstitution.campuses.length > 1) {
    return (
      <View>
        <Text style={styles.title}>Which campus do you attend?</Text>
        <Text style={styles.sub}>{selectedInstitution.name}</Text>
        {selectedInstitution.campuses.map((campus) => {
          const on = selectedCampusId === campus.id;
          return (
            <Pressable
              key={campus.id}
              onPress={() => onSelectCampus(campus, selectedInstitution)}
              style={[styles.row, on && styles.rowOn]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={on ? Skoun.color.primary : Skoun.color.ink}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{campus.name}</Text>
                {campus.city ? (
                  <Text style={styles.rowMeta}>{campus.city}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setInstitutionId(null)} style={styles.back}>
          <Text style={styles.backText}>Change university</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search university..."
        placeholderTextColor="#A1A1AA"
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!query && popular.length > 0 ? (
        <View style={styles.popularWrap}>
          <Text style={styles.sectionLabel}>Popular universities</Text>
          {popular.map((inst) => (
            <Pressable
              key={inst.id}
              onPress={() => pickInstitution(inst)}
              style={styles.row}
            >
              <InstitutionLogo
                slug={inst.slug}
                shortName={inst.shortName}
                website={inst.website}
                logoUrl={inst.logoUrl}
                size={36}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{inst.name}</Text>
                <Text style={styles.rowMeta}>{inst.shortName}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.sectionLabel}>
        {query ? "Results" : "All universities"}
      </Text>
      {filtered.map((inst) => (
        <Pressable
          key={inst.id}
          onPress={() => pickInstitution(inst)}
          style={styles.row}
        >
          <InstitutionLogo
            slug={inst.slug}
            shortName={inst.shortName}
            website={inst.website}
            logoUrl={inst.logoUrl}
            size={36}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{inst.name}</Text>
            <Text style={styles.rowMeta}>
              {inst.shortName}
              {inst.campuses.length > 1
                ? ` · ${inst.campuses.length} campuses`
                : ""}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 24, alignItems: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Skoun.color.ink,
    marginBottom: 8,
  },
  sub: { color: Skoun.color.inkMuted, marginBottom: 12 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Skoun.color.primary,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  search: {
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: Skoun.color.ink,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Skoun.color.inkMuted,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  popularWrap: { marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  rowOn: { backgroundColor: Skoun.color.primaryMist },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: Skoun.color.ink },
  rowMeta: { fontSize: 13, color: Skoun.color.inkMuted, marginTop: 2 },
  back: { marginTop: 16, alignSelf: "flex-start" },
  backText: { color: Skoun.color.primary, fontWeight: "600" },
});
