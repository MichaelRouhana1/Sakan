import { useMemo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { LocationPicker } from "@/components/listings/LocationPicker";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { LEBANON_AREAS, type LebanonArea } from "@/constants/areas";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { useUniversities } from "@/features/universities/useUniversities";
import { formatCampusWalkLine } from "@/lib/listingCardMeta";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function CreateStepLocation() {
  const { draft, patch } = useCreateListingDraft();
  const areaInvalid = useWizardFieldInvalid("area");
  const pinInvalid = useWizardFieldInvalid("pin");
  const campusInvalid = useWizardFieldInvalid("primaryCampusId");
  const campuses = useUniversities();
  const uni = (campuses.data ?? []).find((c) => c.id === draft.primaryCampusId);
  const walk =
    draft.pin.confirmed && uni?.lat != null && uni.lng != null
      ? formatCampusWalkLine(
          haversineMeters(
            { lat: draft.pin.lat, lng: draft.pin.lng },
            { lat: uni.lat, lng: uni.lng },
          ),
          uni.displayName ?? uni.name,
        )
      : null;

  const campusOptions = useMemo(
    () =>
      (campuses.data ?? []).map((c) => ({
        value: c.id,
        label: c.institutionShortName
          ? `${c.institutionShortName} · ${c.city ?? c.name}`
          : c.displayName ?? c.name,
      })),
    [campuses.data],
  );

  return (
    <View style={{ gap: 16 }}>
      <Enter>
        <WizardFieldLabel required>Area</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={LEBANON_AREAS.map((a) => ({ value: a, label: a }))}
          value={draft.area}
          error={areaInvalid}
          onChange={(v) => patch({ area: v as LebanonArea })}
        />
      </Enter>
      <Enter delay={70}>
        <LText variant="subtitle">Building & street</LText>
        <TextInput
          accessibilityLabel="Building name"
          placeholder="Building name"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.buildingName}
          onChangeText={(buildingName) => patch({ buildingName })}
          style={wizardInputStyle()}
        />
        <TextInput
          accessibilityLabel="Street or address"
          placeholder="Street / address line"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.addressLine}
          onChangeText={(addressLine) => patch({ addressLine })}
          style={wizardInputStyle()}
        />
      </Enter>
      {draft.area ? (
        <Enter delay={120}>
          <WizardFieldLabel required>Map pin</WizardFieldLabel>
          <View style={{ height: 8 }} />
          <LocationPicker
            area={draft.area}
            value={draft.pin}
            invalid={pinInvalid}
            onChange={(pin) =>
              patch({
                pin,
                landmark: pin.landmarkLabel || draft.landmark,
              })
            }
          />
        </Enter>
      ) : pinInvalid ? (
        <Enter delay={120}>
          <WizardFieldLabel required>Map pin</WizardFieldLabel>
          <View style={{ height: 8 }} />
          <LText variant="caption" tone="muted">
            Pick an area to load the map.
          </LText>
        </Enter>
      ) : (
        <LText variant="caption" tone="muted">
          Pick an area to load the map.
        </LText>
      )}
      <Enter delay={180}>
        <WizardFieldLabel required>Primary campus</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <WizardFieldGroup field="primaryCampusId">
          <View style={styles.campusWrap}>
            {campusOptions.map((opt) => {
              const on = opt.value === draft.primaryCampusId;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => patch({ primaryCampusId: opt.value })}
                  style={[
                    styles.campus,
                    on && styles.campusOn,
                    campusInvalid && !on && styles.campusError,
                  ]}
                >
                  <LText variant="caption" style={on ? styles.campusLabelOn : undefined}>
                    {opt.label}
                  </LText>
                </Pressable>
              );
            })}
          </View>
        </WizardFieldGroup>
        {walk ? (
          <LText variant="caption" tone="primary" style={{ marginTop: 8 }}>
            {walk}
          </LText>
        ) : null}
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  campusWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  campus: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Lister.radius.pill,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  campusOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  campusError: {
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  campusLabelOn: { color: Lister.color.primaryDeep, fontFamily: Lister.type.bodySemi },
});
