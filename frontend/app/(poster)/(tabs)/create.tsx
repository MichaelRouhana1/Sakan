import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { UtilityPills } from "@/components/lister/UtilityPills";
import {
  LocationPicker,
  StaticPinMap,
  initialPinForArea,
  type ListingPin,
} from "@/components/listings/LocationPicker";
import {
  PhotoPickerGrid,
  type DraftPhoto,
} from "@/components/listings/PhotoPickerGrid";
import { GlassSurface, isAppleGlass } from "@/components/ui/Glass";
import { LEBANON_AREAS, type LebanonArea } from "@/constants/areas";
import { Lister } from "@/constants/listerTheme";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { useCreateListing } from "@/features/listings/useCreateListing";
import { formatFreshUsd } from "@/lib/format";
import {
  formatCoordLabel,
  isInLebanon,
  toWkt,
} from "@/lib/locationWkt";
import {
  GENDER_RESTRICTION_LABELS,
  LISTING_TYPE_LABELS,
  TARGET_AUDIENCE_LABELS,
} from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import type {
  ElectricityStatus,
  GenderRestriction,
  ListingType,
  WaterStatus,
} from "@/types/listing";

type Step = "place" | "pin" | "details" | "utilities" | "photos" | "review";

const STEPS: Step[] = [
  "place",
  "pin",
  "details",
  "utilities",
  "photos",
  "review",
];
const STEP_LABELS: Record<Step, string> = {
  place: "Area",
  pin: "Pin",
  details: "Info",
  utilities: "Power",
  photos: "Pics",
  review: "Go",
};

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <LText
        variant="caption"
        style={{
          color: selected ? Lister.color.surface : Lister.color.ink,
          fontFamily: Lister.type.bodySemi,
        }}
      >
        {label}
      </LText>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <LText variant="body" tone={value ? "primary" : "ink"}>
        {label}
      </LText>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export default function CreateListingScreen() {
  const create = useCreateListing();
  const [step, setStep] = useState<Step>("place");
  const [areaQuery, setAreaQuery] = useState("");
  const [area, setArea] = useState<LebanonArea | null>(null);
  const [pin, setPin] = useState<ListingPin | null>(null);
  const [listingType, setListingType] = useState<ListingType>("studio");
  const [studentsOnly, setStudentsOnly] = useState(false);
  const [genderRestriction, setGenderRestriction] =
    useState<GenderRestriction>("anyone");
  const [rent, setRent] = useState("800");
  const [electricity, setElectricity] =
    useState<ElectricityStatus>("generator_24_7");
  const [water, setWater] = useState<WaterStatus>("state_well_24_7");
  const [wifiIncluded, setWifiIncluded] = useState(true);
  const [routerUps, setRouterUps] = useState(false);
  const [elevator24_7, setElevator24_7] = useState(false);
  const [lookingForRoommate, setLookingForRoommate] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const rentUsd = Number.parseInt(rent, 10);
  const stepIndex = STEPS.indexOf(step);
  const readyUrls = photos
    .filter((p) => p.status === "ready" && p.url)
    .map((p) => p.url as string);
  const photosBusy = photos.some((p) => p.status === "uploading");
  const photosFailed = photos.some((p) => p.status === "error");
  const pinReady =
    pin != null &&
    pin.confirmed &&
    isInLebanon({ lng: pin.lng, lat: pin.lat });
  const landmarkLabel = pin?.landmarkLabel.trim() ?? "";

  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return [...LEBANON_AREAS];
    return LEBANON_AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [areaQuery]);

  function selectArea(next: LebanonArea) {
    setArea(next);
    setPin(initialPinForArea(next));
  }

  function canNext(): boolean {
    if (step === "place") return area != null;
    if (step === "pin") return pinReady;
    if (step === "details") return Number.isFinite(rentUsd) && rentUsd > 0;
    if (step === "photos") {
      return readyUrls.length >= 1 && !photosBusy && !photosFailed;
    }
    return true;
  }

  function goNext() {
    if (!canNext()) {
      if (step === "pin" && !pinReady) {
        setFormError(
          "Confirm a map pin or landmark before continuing. Area center alone isn’t enough.",
        );
      } else if (step === "photos" && readyUrls.length < 1) {
        setFormError("Add at least 1 photo before continuing.");
      } else if (step === "photos" && photosBusy) {
        setFormError("Wait for uploads to finish.");
      } else if (step === "photos" && photosFailed) {
        setFormError("Retry failed uploads or remove them.");
      }
      return;
    }
    setFormError(null);
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  async function onPublish() {
    if (!area || !pin || !pinReady || !Number.isFinite(rentUsd) || rentUsd <= 0)
      return;
    if (readyUrls.length < 1) {
      setFormError("Add at least 1 photo to publish.");
      setStep("photos");
      return;
    }
    if (photosBusy) {
      setFormError("Wait for photo uploads to finish.");
      return;
    }
    if (photosFailed) {
      setFormError("Fix failed photo uploads before publishing.");
      setStep("photos");
      return;
    }

    setFormError(null);
    try {
      const listing = await create.mutateAsync({
        listingType,
        targetAudience: studentsOnly ? "students_only" : "anyone",
        genderRestriction,
        monthlyRentUsd: rentUsd,
        electricity,
        water,
        wifiIncluded,
        routerUps,
        elevator24_7,
        area,
        landmark: landmarkLabel || undefined,
        locationWkt: toWkt({ lng: pin.lng, lat: pin.lat }),
        photoUrls: readyUrls,
        publishNow: true,
        lookingForRoommate,
      });
      // Push (not replace) so listing detail has stack history for Back.
      router.push({
        pathname: "/(poster)/listing/[id]",
        params: { id: listing.id },
      });
    } catch {
      setFormError("Could not publish. Check your connection and try again.");
    }
  }

  return (
    <ListerScreen edges={["top", "left", "right"]}>
      <View style={styles.flex}>
        <Enter>
          <View style={styles.header}>
            <LText variant="label" tone="brass">
              New listing
            </LText>
            <LText variant="display" style={styles.display}>
              List a place
            </LText>
            <LText variant="body" tone="muted">
              Free to publish — live for 30 days.
            </LText>
            <View style={styles.progress}>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.progressItem}>
                  <View
                    style={[styles.dot, i <= stepIndex && styles.dotOn]}
                  />
                  <LText
                    variant="caption"
                    tone={i === stepIndex ? "primary" : "faint"}
                  >
                    {STEP_LABELS[s]}
                  </LText>
                </View>
              ))}
            </View>
          </View>
        </Enter>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "place" ? (
            <View style={styles.block}>
              <LText variant="subtitle">Which area?</LText>
              <LText variant="body" tone="muted">
                Used for Cities browse. You’ll set the exact pin next — that
                drives university distance.
              </LText>
              <TextInput
                style={styles.input}
                placeholder="Search areas…"
                placeholderTextColor={Lister.color.inkFaint}
                value={areaQuery}
                onChangeText={setAreaQuery}
              />
              <View style={styles.areaList}>
                {filteredAreas.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => selectArea(a)}
                    style={[styles.areaRow, area === a && styles.areaRowOn]}
                  >
                    <LText
                      variant="body"
                      tone={area === a ? "primary" : "ink"}
                      style={
                        area === a
                          ? { fontFamily: Lister.type.bodySemi }
                          : undefined
                      }
                    >
                      {a}
                    </LText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === "pin" && area && pin ? (
            <View style={styles.block}>
              <LocationPicker area={area} value={pin} onChange={setPin} />
              {formError ? (
                <LText variant="body" tone="danger" accessibilityRole="alert">
                  {formError}
                </LText>
              ) : null}
            </View>
          ) : null}

          {step === "details" ? (
            <View style={styles.block}>
              <LText variant="subtitle">Listing details</LText>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Type
              </LText>
              <View style={styles.wrap}>
                {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map(
                  (value) => (
                    <SelectChip
                      key={value}
                      label={LISTING_TYPE_LABELS[value]}
                      selected={listingType === value}
                      onPress={() => setListingType(value)}
                    />
                  ),
                )}
              </View>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Students
              </LText>
              <ToggleRow
                label={TARGET_AUDIENCE_LABELS.students_only}
                value={studentsOnly}
                onToggle={() => setStudentsOnly((v) => !v)}
              />
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Roommate
              </LText>
              <ToggleRow
                label="Looking for a roommate / spare bed"
                value={lookingForRoommate}
                onToggle={() => setLookingForRoommate((v) => !v)}
              />
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Gender
              </LText>
              <View style={styles.wrap}>
                {(
                  Object.keys(
                    GENDER_RESTRICTION_LABELS,
                  ) as GenderRestriction[]
                ).map((value) => (
                  <SelectChip
                    key={value}
                    label={GENDER_RESTRICTION_LABELS[value]}
                    selected={genderRestriction === value}
                    onPress={() => setGenderRestriction(value)}
                  />
                ))}
              </View>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Monthly rent (USD)
              </LText>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={rent}
                onChangeText={setRent}
              />
            </View>
          ) : null}

          {step === "utilities" ? (
            <View style={styles.block}>
              <LText variant="subtitle">Lebanese utilities</LText>
              <LText variant="body" tone="muted">
                Be accurate — false claims can get a listing removed.
              </LText>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Electricity
              </LText>
              <View style={styles.wrap}>
                {(Object.keys(ELECTRICITY_LABELS) as ElectricityStatus[]).map(
                  (key) => (
                    <SelectChip
                      key={key}
                      label={ELECTRICITY_LABELS[key]}
                      selected={electricity === key}
                      onPress={() => setElectricity(key)}
                    />
                  ),
                )}
              </View>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Water
              </LText>
              <View style={styles.wrap}>
                {(Object.keys(WATER_LABELS) as WaterStatus[]).map((key) => (
                  <SelectChip
                    key={key}
                    label={WATER_LABELS[key]}
                    selected={water === key}
                    onPress={() => setWater(key)}
                  />
                ))}
              </View>
              <LText variant="label" tone="muted" style={styles.fieldLabel}>
                Extras
              </LText>
              <ToggleRow
                label="Wi‑Fi included"
                value={wifiIncluded}
                onToggle={() => setWifiIncluded((v) => !v)}
              />
              <ToggleRow
                label="Router UPS backup"
                value={routerUps}
                onToggle={() => setRouterUps((v) => !v)}
              />
              <ToggleRow
                label="24/7 working elevator"
                value={elevator24_7}
                onToggle={() => setElevator24_7((v) => !v)}
              />
            </View>
          ) : null}

          {step === "photos" ? (
            <View style={styles.block}>
              <PhotoPickerGrid photos={photos} setPhotos={setPhotos} />
              {formError ? (
                <LText variant="body" tone="danger">
                  {formError}
                </LText>
              ) : null}
            </View>
          ) : null}

          {step === "review" && area && pin ? (
            <View style={styles.block}>
              <LText variant="subtitle">Review & publish</LText>
              {readyUrls[0] ? (
                <View style={styles.reviewCover}>
                  <Image
                    source={{ uri: readyUrls[0] }}
                    style={styles.reviewCoverImage}
                    contentFit="cover"
                  />
                  <View style={styles.reviewCoverBadge}>
                    <LText
                      variant="caption"
                      style={styles.reviewCoverBadgeText}
                    >
                      Cover · {readyUrls.length} photo
                      {readyUrls.length === 1 ? "" : "s"}
                    </LText>
                  </View>
                </View>
              ) : null}

              <StaticPinMap coord={{ lng: pin.lng, lat: pin.lat }} />

              <View style={styles.reviewCard}>
                <View style={styles.pinConfirmRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Lister.color.primary}
                  />
                  <LText variant="caption" tone="primary" style={styles.pinConfirmText}>
                    Pin set · {formatCoordLabel({ lng: pin.lng, lat: pin.lat })}
                  </LText>
                </View>
                <LText variant="title">
                  {area}
                  {landmarkLabel ? ` · ${landmarkLabel}` : ""}
                </LText>
                <LText variant="body" tone="muted">
                  {LISTING_TYPE_LABELS[listingType]}
                  {studentsOnly
                    ? ` · ${TARGET_AUDIENCE_LABELS.students_only}`
                    : ""}
                  {genderRestriction !== "anyone"
                    ? ` · ${GENDER_RESTRICTION_LABELS[genderRestriction]}`
                    : ""}
                </LText>
                <LText variant="body" tone="primary" style={rentPriceType}>
                  {formatFreshUsd(rentUsd)}
                </LText>
                <UtilityPills
                  listing={{
                    electricity,
                    water,
                    wifiIncluded,
                    routerUps,
                    elevator24_7,
                  }}
                />
              </View>
              <LText variant="caption" tone="muted">
                Goes live immediately. Campus distances use this pin, not the
                area center.
              </LText>
              {formError ? (
                <LText variant="body" tone="danger">
                  {formError}
                </LText>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <GlassSurface intensity="chrome" style={styles.footer}>
          <View style={styles.footerInner}>
            {stepIndex > 0 ? (
              <LButton
                label="Back"
                variant="ghost"
                onPress={goBack}
                style={styles.footerGhost}
              />
            ) : (
              <View style={styles.footerGhost} />
            )}
            {step !== "review" ? (
              <LButton
                label="Continue"
                disabled={!canNext()}
                onPress={goNext}
                style={styles.footerCta}
              />
            ) : (
              <LButton
                label="Publish listing"
                loading={create.isPending}
                disabled={
                  !pinReady || readyUrls.length < 1 || photosBusy
                }
                onPress={() => void onPublish()}
                style={styles.footerCta}
              />
            )}
          </View>
        </GlassSurface>
      </View>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Lister.space.lg,
    paddingTop: Lister.space.sm,
    gap: 4,
  },
  display: { fontSize: 30 },
  progress: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Lister.space.md,
    marginBottom: Lister.space.sm,
  },
  progressItem: { alignItems: "center", gap: 6, flex: 1 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Lister.color.border,
  },
  dotOn: { backgroundColor: Lister.color.primary },
  scroll: {
    paddingHorizontal: Lister.space.lg,
    paddingBottom: Lister.space.lg,
  },
  block: { gap: 10 },
  fieldLabel: { marginTop: 8 },
  input: {
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: Lister.type.body,
    fontSize: 16,
    color: Lister.color.ink,
  },
  areaList: {
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    maxHeight: 320,
    overflow: "hidden",
  },
  areaRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Lister.color.border,
  },
  areaRowOn: {
    backgroundColor: Lister.color.primaryMist,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  chipOn: {
    backgroundColor: Lister.color.primary,
    borderColor: Lister.color.primary,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Lister.color.border,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: Lister.color.primary },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Lister.color.surface,
  },
  knobOn: { alignSelf: "flex-end" },
  reviewCover: {
    height: 180,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    backgroundColor: Lister.color.bgWash,
  },
  reviewCoverImage: { width: "100%", height: "100%" },
  reviewCoverBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: Lister.color.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Lister.radius.pill,
  },
  reviewCoverBadgeText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
  },
  reviewCard: {
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.lg,
    borderWidth: 1,
    borderColor: Lister.color.border,
    padding: Lister.space.md,
    gap: 10,
  },
  pinConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pinConfirmText: { fontFamily: Lister.type.bodySemi },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isAppleGlass
      ? "rgba(201,214,207,0.45)"
      : Lister.color.border,
    borderRadius: 0,
  },
  footerInner: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Lister.space.lg,
    paddingTop: 12,
    paddingBottom: isAppleGlass ? 88 : 10,
  },
  footerGhost: { flex: 0.7 },
  footerCta: { flex: 1.4 },
});
