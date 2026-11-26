import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Studently } from "@/constants/theme";
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
  subtitle?: string;
  hideTitle?: boolean;
  savingCampusId?: string | null;
  disabled?: boolean;
};

function hapticSelect() {
  if (Platform.OS !== "web") {
    void Haptics.selectionAsync().catch(() => {});
  }
}

export function InstitutionCampusPicker({
  selectedCampusId,
  onSelectCampus,
  title = "Where do you study?",
  subtitle = "We’ll highlight nearby listings, walk times, and campus perks.",
  hideTitle = false,
  savingCampusId = null,
  disabled = false,
}: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const catalog = useInstitutions();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  const institutions = catalog.data ?? [];
  const selectedInstitution =
    institutions.find((i) => i.id === institutionId) ?? null;

  const trimmedQuery = query.trim();

  const filtered = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
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
  }, [institutions, trimmedQuery]);

  const popular = useMemo(
    () =>
      institutions.filter((inst) =>
        (POPULAR_INSTITUTION_SLUGS as readonly string[]).includes(inst.slug),
      ),
    [institutions],
  );

  const otherInstitutions = useMemo(() => {
    if (trimmedQuery) return filtered;
    const popularIds = new Set(popular.map((p) => p.id));
    return institutions.filter((inst) => !popularIds.has(inst.id));
  }, [filtered, institutions, popular, trimmedQuery]);

  const busy = disabled || Boolean(savingCampusId);

  const institutionHasSelectedCampus = (inst: Institution) =>
    Boolean(selectedCampusId) &&
    inst.campuses.some((c) => c.id === selectedCampusId);

  const pickInstitution = (inst: Institution) => {
    if (busy) return;
    hapticSelect();
    if (inst.campuses.length === 1) {
      onSelectCampus(inst.campuses[0], inst);
      return;
    }
    setInstitutionId(inst.id);
  };

  const pickCampus = (campus: University, inst: Institution) => {
    if (busy) return;
    hapticSelect();
    onSelectCampus(campus, inst);
  };

  if (catalog.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Studently.color.primary} size="small" />
        <Text style={styles.loadingText}>Loading universities…</Text>
      </View>
    );
  }

  if (catalog.isError) {
    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconWrap}>
          <Ionicons
            name="cloud-offline-outline"
            size={designSize(24)}
            color={Studently.color.primary}
          />
        </View>
        <Text style={styles.stateTitle}>Couldn’t load universities</Text>
        <Text style={styles.stateSub}>
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={() => void catalog.refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading universities"
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.pressedBtn,
          ]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (selectedInstitution && selectedInstitution.campuses.length > 1) {
    return (
      <View style={styles.root}>
        <Pressable
          onPress={() => {
            if (!busy) setInstitutionId(null);
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Back to all universities"
          style={({ pressed }) => [
            styles.backPill,
            pressed && styles.rowPressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={designSize(16)}
            color={Studently.color.ink}
          />
          <Text style={styles.backText}>All universities</Text>
        </Pressable>

        <View style={styles.instBanner}>
          <InstitutionLogo
            slug={selectedInstitution.slug}
            shortName={selectedInstitution.shortName}
            website={selectedInstitution.website}
            logoUrl={selectedInstitution.logoUrl}
            size={designSize(44)}
          />
          <View style={styles.instBannerCopy}>
            <Text style={styles.instBannerTitle}>
              {selectedInstitution.name}
            </Text>
            <Text style={styles.instBannerSub}>
              Choose your campus · {selectedInstitution.campuses.length} locations
            </Text>
          </View>
        </View>

        <View style={styles.campusList}>
          {selectedInstitution.campuses.map((campus) => {
            const isSelected = selectedCampusId === campus.id;
            const isSaving = savingCampusId === campus.id;
            return (
              <Pressable
                key={campus.id}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, busy: isSaving }}
                onPress={() => pickCampus(campus, selectedInstitution)}
                style={({ pressed }) => [
                  styles.campusCard,
                  isSelected && styles.campusCardSelected,
                  pressed && !busy && styles.rowPressed,
                ]}
              >
                <View
                  style={[
                    styles.campusIconWrap,
                    isSelected && styles.campusIconWrapSelected,
                  ]}
                >
                  <Ionicons
                    name={isSelected ? "location" : "location-outline"}
                    size={designSize(18)}
                    color={
                      isSelected
                        ? Studently.color.primary
                        : Studently.color.inkMuted
                    }
                  />
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[
                      styles.rowTitle,
                      isSelected && styles.rowTitleSelected,
                    ]}
                  >
                    {campus.name}
                  </Text>
                  {campus.city ? (
                    <Text style={styles.rowMeta}>{campus.city}</Text>
                  ) : null}
                </View>
                {isSaving ? (
                  <ActivityIndicator
                    size="small"
                    color={Studently.color.primary}
                  />
                ) : isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={designSize(22)}
                    color={Studently.color.primary}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={designSize(16)}
                    color={Studently.color.inkFaint}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!hideTitle ? (
        <View style={styles.headingBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.searchWrap,
          searchFocused && styles.searchWrapFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={designSize(18)}
          color={
            searchFocused ? Studently.color.ink : Studently.color.inkFaint
          }
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search university, acronym, or city..."
          placeholderTextColor={Studently.color.inkFaint}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search university"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clearBtn}
          >
            <Ionicons
              name="close-circle"
              size={designSize(18)}
              color={Studently.color.inkFaint}
            />
          </Pressable>
        ) : null}
      </View>

      {!trimmedQuery && popular.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Popular universities</Text>
          <View style={styles.popularGrid}>
            {popular.map((inst) => {
              const isSelected = institutionHasSelectedCampus(inst);
              const isSaving =
                inst.campuses.length === 1 &&
                savingCampusId === inst.campuses[0]?.id;
              return (
                <Pressable
                  key={inst.id}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, busy: isSaving }}
                  onPress={() => pickInstitution(inst)}
                  style={({ pressed }) => [
                    styles.popularCard,
                    isSelected && styles.popularCardSelected,
                    pressed && !busy && styles.rowPressed,
                  ]}
                >
                  <View style={styles.popularCardTop}>
                    <InstitutionLogo
                      slug={inst.slug}
                      shortName={inst.shortName}
                      website={inst.website}
                      logoUrl={inst.logoUrl}
                      size={designSize(34)}
                    />
                    {isSaving ? (
                      <ActivityIndicator
                        size="small"
                        color={Studently.color.primary}
                      />
                    ) : isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={designSize(18)}
                        color={Studently.color.primary}
                      />
                    ) : inst.campuses.length > 1 ? (
                      <Ionicons
                        name="chevron-forward"
                        size={designSize(15)}
                        color={Studently.color.inkFaint}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.popularShort,
                      isSelected && styles.rowTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {inst.shortName}
                  </Text>
                  <Text style={styles.popularMeta} numberOfLines={1}>
                    {inst.campuses.length > 1
                      ? `${inst.campuses.length} campuses`
                      : inst.campuses[0]?.city || inst.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>
          {trimmedQuery
            ? `Results (${otherInstitutions.length})`
            : popular.length > 0
              ? "More universities"
              : "All universities"}
        </Text>

        {otherInstitutions.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons
                name="search-outline"
                size={designSize(22)}
                color={Studently.color.inkMuted}
              />
            </View>
            <Text style={styles.stateTitle}>
              No universities match “{trimmedQuery}”
            </Text>
            <Text style={styles.stateSub}>
              Try an acronym like AUB, LAU, USJ, or a city name.
            </Text>
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.clearSearchPill,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.clearSearchPillText}>Clear search</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listCard}>
            {otherInstitutions.map((inst, index) => {
              const isSelected = institutionHasSelectedCampus(inst);
              const isSaving =
                inst.campuses.length === 1 &&
                savingCampusId === inst.campuses[0]?.id;
              const isLast = index === otherInstitutions.length - 1;
              const singleCity =
                inst.campuses.length === 1 ? inst.campuses[0]?.city : null;
              return (
                <Pressable
                  key={inst.id}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, busy: isSaving }}
                  onPress={() => pickInstitution(inst)}
                  style={({ pressed }) => [
                    styles.listRow,
                    !isLast && styles.listRowDivider,
                    isSelected && styles.listRowSelected,
                    pressed && !busy && styles.rowPressed,
                  ]}
                >
                  <InstitutionLogo
                    slug={inst.slug}
                    shortName={inst.shortName}
                    website={inst.website}
                    logoUrl={inst.logoUrl}
                    size={designSize(38)}
                  />
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowTitle,
                        isSelected && styles.rowTitleSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {inst.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {inst.shortName}
                      {inst.campuses.length > 1
                        ? ` · ${inst.campuses.length} campuses`
                        : singleCity
                          ? ` · ${singleCity}`
                          : ""}
                    </Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={Studently.color.primary}
                    />
                  ) : isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={designSize(20)}
                      color={Studently.color.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={designSize(16)}
                      color={Studently.color.inkFaint}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: {
    gap: 18,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: Studently.color.inkMuted,
  },
  headingBlock: {
    gap: 4,
  },
  title: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Studently.color.ink,
  },
  sub: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Studently.color.inkMuted,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchWrapFocused: {
    borderColor: Studently.color.ink,
  },
  searchInput: {
    flex: 1,
    fontFamily: Studently.type.body,
    fontSize: 15,
    color: Studently.color.ink,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 2,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    letterSpacing: 0.7,
    color: Studently.color.inkMuted,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  popularCard: {
    width: "48.5%",
    backgroundColor: Studently.color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Studently.color.border,
    padding: 12,
    gap: 6,
  },
  popularCardSelected: {
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.primaryMist,
  },
  popularCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  popularShort: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 15,
    color: Studently.color.ink,
  },
  popularMeta: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    color: Studently.color.inkMuted,
  },
  listCard: {
    backgroundColor: Studently.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Studently.color.border,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studently.color.border,
  },
  listRowSelected: {
    backgroundColor: Studently.color.primaryMist,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: Studently.color.ink,
  },
  rowTitleSelected: {
    color: Studently.color.primaryDeep,
  },
  rowMeta: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.inkMuted,
  },
  backPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Studently.radius.pill,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  backText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    color: Studently.color.ink,
  },
  instBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  instBannerCopy: {
    flex: 1,
    gap: 2,
  },
  instBannerTitle: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    color: Studently.color.ink,
  },
  instBannerSub: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    color: Studently.color.inkMuted,
  },
  campusList: {
    gap: 10,
  },
  campusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  campusCardSelected: {
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.primaryMist,
  },
  campusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Studently.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  campusIconWrapSelected: {
    backgroundColor: Studently.color.surface,
  },
  stateCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    gap: 6,
  },
  stateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Studently.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: Studently.color.ink,
    textAlign: "center",
  },
  stateSub: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: Studently.color.inkMuted,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Studently.radius.pill,
    backgroundColor: Studently.color.primary,
  },
  pressedBtn: {
    opacity: 0.88,
  },
  retryText: {
    fontFamily: Studently.type.bodySemi,
    color: "#FFFFFF",
    fontSize: 14,
  },
  clearSearchPill: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Studently.radius.pill,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surfaceMuted,
  },
  clearSearchPillText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    color: Studently.color.ink,
  },
});
