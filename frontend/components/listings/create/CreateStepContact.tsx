import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { AddNumberButton, LebanonPhoneField } from "@/components/listings/create/LebanonPhoneField";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { Lister } from "@/constants/listerTheme";
import { Studently } from "@/constants/theme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import {
  deriveContactPhones,
  emptyContactNumber,
  MAX_CONTACT_NUMBERS,
  makePrimary,
  numbersFromLegacy,
  type ContactNumber,
} from "@/lib/lebanonPhone";
import type { ListingPosterRole } from "@/types/listing";

const ROLE_OPTIONS: readonly {
  value: ListingPosterRole;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "landlord",
    title: "Landlord / owner",
    hint: "You own or manage the place",
    icon: "key-outline",
  },
  {
    value: "student_sublet",
    title: "Current student subletting",
    hint: "Passing on your lease or room",
    icon: "school-outline",
  },
  {
    value: "agent",
    title: "Agent / broker",
    hint: "Listing on behalf of an owner",
    icon: "briefcase-outline",
  },
];

export function CreateStepContact({ look = "1" }: { look?: "1" | "2" }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const compact = layoutWidth < 620;
  const [nameFocused, setNameFocused] = useState(false);
  const { draft, patch, fieldInvalid } = useListingForm();
  const roleInvalid = fieldInvalid("listingPosterRole");
  const nameInvalid = fieldInvalid("contactName");

  const numbers: ContactNumber[] = numbersFromLegacy(draft);

  function setNumbers(next: ContactNumber[]) {
    const derived = deriveContactPhones(next);
    patch({
      contactNumbers: next,
      contactPhone: derived.contactPhone ?? "",
      whatsappNumber: derived.whatsappNumber ?? "",
      whatsappSameAsPhone:
        Boolean(derived.contactPhone) &&
        derived.contactPhone === derived.whatsappNumber,
    });
  }

  if (look === "2") {
    return (
      <View style={styles.v2Root}>
        <View style={styles.v2Field}>
          <Text style={styles.v2Label}>
            Your role <Text style={styles.v2Required}>*</Text>
          </Text>
          <WizardFieldGroup
            field="listingPosterRole"
            style={compact ? styles.roleGridCompact : styles.roleGrid}
          >
            {ROLE_OPTIONS.map((option) => {
              const selected = draft.listingPosterRole === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.title}
                  accessibilityState={{ selected }}
                  onPress={() => patch({ listingPosterRole: option.value })}
                  style={(state) => [
                    styles.roleTile,
                    compact && styles.roleTileCompact,
                    state.hovered && !selected && styles.roleTileHover,
                    selected && styles.roleTileSelected,
                    roleInvalid && !selected && styles.roleTileError,
                  ]}
                >
                  <View style={styles.roleTopRow}>
                    <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
                      <Ionicons
                        name={option.icon}
                        size={designSize(17)}
                        color={selected ? "#EA3F4A" : "#4A4540"}
                      />
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </View>
                  <Text style={styles.roleTitle}>{option.title}</Text>
                  <Text style={styles.roleHint}>{option.hint}</Text>
                </Pressable>
              );
            })}
          </WizardFieldGroup>
        </View>

        <View style={styles.v2Field}>
          <Text style={styles.v2Label}>
            Contact name <Text style={styles.v2Required}>*</Text>
          </Text>
          <TextInput
            accessibilityLabel="Contact name"
            placeholder="Your full name or agency"
            placeholderTextColor="#8B857F"
            value={draft.contactName}
            onChangeText={(contactName) => patch({ contactName })}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={[
              styles.v2Input,
              nameFocused && styles.v2InputFocus,
              nameInvalid && styles.v2InputError,
            ]}
          />
        </View>

        <View style={styles.v2Field}>
          <View style={styles.v2LabelStack}>
            <Text style={styles.v2Label}>
              Phone numbers <Text style={styles.v2Required}>*</Text>
            </Text>
            <Text style={styles.v2Helper}>
              Students use your primary number to call or message on WhatsApp.
            </Text>
          </View>
          <View style={styles.v2Phones}>
            {numbers.map((n, i) => (
              <View key={n.id} style={i > 0 ? styles.v2PhoneRowBorder : undefined}>
                <LebanonPhoneField
                  index={i}
                  value={n}
                  others={numbers.filter((_, j) => j !== i)}
                  error={fieldInvalid(`contactNumbers.${i}`)}
                  primary={Boolean(n.primary)}
                  canRemove={numbers.length > 1}
                  onChange={(next) =>
                    setNumbers(numbers.map((row, j) => (j === i ? next : row)))
                  }
                  onRemove={() => setNumbers(numbers.filter((_, j) => j !== i))}
                  onMakePrimary={() => setNumbers(makePrimary(numbers, n.id))}
                />
              </View>
            ))}
            {numbers.length < MAX_CONTACT_NUMBERS ? (
              <View style={styles.v2AddWrap}>
                <AddNumberButton onPress={() => setNumbers([...numbers, emptyContactNumber()])} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: designSize(12) }}>
      <Enter>
        <WizardFieldLabel required>Your role</WizardFieldLabel>
        <View style={{ height: designSize(8) }} />
        <WizardFieldGroup field="listingPosterRole" style={{ gap: designSize(8) }}>
          <SelectableCard
            selected={draft.listingPosterRole === "landlord"}
            title="Landlord / owner"
            icon="key-outline"
            error={roleInvalid}
            onPress={() => patch({ listingPosterRole: "landlord" as ListingPosterRole })}
          />
          <SelectableCard
            selected={draft.listingPosterRole === "student_sublet"}
            title="Current student subletting"
            icon="school-outline"
            error={roleInvalid}
            onPress={() => patch({ listingPosterRole: "student_sublet" })}
          />
          <SelectableCard
            selected={draft.listingPosterRole === "agent"}
            title="Agent / broker"
            icon="briefcase-outline"
            error={roleInvalid}
            onPress={() => patch({ listingPosterRole: "agent" })}
          />
        </WizardFieldGroup>
      </Enter>
      <Enter delay={80}>
        <WizardFieldLabel required>Contact name</WizardFieldLabel>
        <TextInput
          accessibilityLabel="Contact name"
          placeholder="Your name"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.contactName}
          onChangeText={(contactName) => patch({ contactName })}
          style={wizardInputStyle(nameInvalid, designSize)}
        />
      </Enter>
      <Enter delay={140}>
        <WizardFieldLabel required>Phone numbers</WizardFieldLabel>
        <View style={styles.phones}>
          {numbers.map((n, i) => (
            <LebanonPhoneField
              key={n.id}
              index={i}
              value={n}
              others={numbers.filter((_, j) => j !== i)}
              error={fieldInvalid(`contactNumbers.${i}`)}
              primary={Boolean(n.primary)}
              canRemove={numbers.length > 1}
              onChange={(next) =>
                setNumbers(numbers.map((row, j) => (j === i ? next : row)))
              }
              onRemove={() => setNumbers(numbers.filter((_, j) => j !== i))}
              onMakePrimary={() => setNumbers(makePrimary(numbers, n.id))}
            />
          ))}
          {numbers.length < MAX_CONTACT_NUMBERS ? (
            <AddNumberButton onPress={() => setNumbers([...numbers, emptyContactNumber()])} />
          ) : null}
        </View>
      </Enter>
    </View>
  );
}

const webCursor = Platform.OS === "web" ? ({ cursor: "pointer" } as unknown as ViewStyle) : {};
const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "background-color, border-color",
        transitionDuration: "160ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      } as unknown as ViewStyle)
    : {};

const baseStyles = StyleSheet.create({
  phones: { gap: 10, marginTop: 8 },
  v2Root: { gap: 24 },
  v2Field: { gap: 10 },
  v2LabelStack: { gap: 3 },
  v2Label: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: "#1C1917",
  },
  v2Required: {
    color: "#EA3F4A",
  },
  v2Helper: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#5C5752",
  },
  roleGrid: {
    flexDirection: "row",
    gap: 10,
  },
  roleGridCompact: {
    flexDirection: "column",
    gap: 10,
  },
  roleTile: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E1DC",
    backgroundColor: "#FFFFFF",
    gap: 6,
    ...webCursor,
    ...webTransition,
  },
  roleTileCompact: {
    flex: 0,
  },
  roleTileHover: {
    borderColor: "#B7B2AB",
    backgroundColor: "#FAF9F7",
  },
  roleTileSelected: {
    borderColor: "#1C1917",
    backgroundColor: "#FAF9F7",
  },
  roleTileError: {
    borderColor: "#DC2626",
  },
  roleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#F4F2EE",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconWrapSelected: {
    backgroundColor: "#FDECEE",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBC6BF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  radioOuterSelected: {
    borderColor: "#EA3F4A",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA3F4A",
  },
  roleTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    lineHeight: 19,
    color: "#1C1917",
  },
  roleHint: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    lineHeight: 17,
    color: "#5C5752",
  },
  v2Input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9D5CE",
    backgroundColor: "#FFFFFF",
    fontFamily: Studently.type.body,
    fontSize: 15,
    lineHeight: 20,
    color: "#1C1917",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as ViewStyle) : {}),
  },
  v2InputFocus: {
    borderColor: "#1C1917",
  },
  v2InputError: {
    borderColor: "#DC2626",
  },
  v2Phones: {
    gap: 14,
  },
  v2PhoneRowBorder: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECEAE6",
  },
  v2AddWrap: {
    paddingTop: 2,
  },
});
