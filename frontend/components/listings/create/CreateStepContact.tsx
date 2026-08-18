import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { LebanonPhoneField } from "@/components/listings/create/LebanonPhoneField";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { Ionicons } from "@expo/vector-icons";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import {
  deriveContactPhones,
  emptyContactNumber,
  MAX_CONTACT_NUMBERS,
  numbersFromLegacy,
  type ContactNumber,
} from "@/lib/lebanonPhone";
import type { ListingPosterRole } from "@/types/listing";

export function CreateStepContact() {
  const { draft, patch, fieldInvalid } = useCreateListingDraft();
  const roleInvalid = fieldInvalid("listingPosterRole");
  const nameInvalid = fieldInvalid("contactName");
  const phonesInvalid = fieldInvalid("contactNumbers");

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

  return (
    <View style={{ gap: 12 }}>
      <Enter>
        <WizardFieldLabel required>Your role</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <WizardFieldGroup field="listingPosterRole" style={{ gap: 8 }}>
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
          style={wizardInputStyle(nameInvalid)}
        />
      </Enter>
      <Enter delay={140}>
        <WizardFieldLabel required>Phone numbers</WizardFieldLabel>
        <LText variant="caption" tone="muted">
          Lebanese format. Mobile (03 / 70 / 71…) or telephone (01 Beirut, 04–09).
          Mark each number for calls, WhatsApp, or both.
        </LText>
        <View style={[styles.phones, phonesInvalid && styles.phonesError]}>
          {numbers.map((n, i) => (
            <LebanonPhoneField
              key={`phone-${i}`}
              index={i}
              value={n}
              error={fieldInvalid(`contactNumbers.${i}`)}
              canRemove={numbers.length > 1}
              onChange={(next) =>
                setNumbers(numbers.map((row, j) => (j === i ? next : row)))
              }
              onRemove={() => setNumbers(numbers.filter((_, j) => j !== i))}
            />
          ))}
          {numbers.length < MAX_CONTACT_NUMBERS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add another phone number"
              onPress={() =>
                setNumbers([
                  ...numbers,
                  emptyContactNumber(
                    numbers.some((n) => n.kind === "mobile") ? "landline" : "mobile",
                  ),
                ])
              }
              style={styles.add}
            >
              <View style={styles.addPlus}>
                <Ionicons name="add" size={22} color={Lister.color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <LText variant="body" style={styles.addTitle}>
                  Add another number
                </LText>
                <LText variant="caption" tone="muted">
                  Extra mobile, WhatsApp-only, or landline
                </LText>
              </View>
            </Pressable>
          ) : null}
        </View>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  phones: { gap: 10, marginTop: 8 },
  phonesError: {
    padding: 8,
    borderRadius: Lister.radius.lg,
    borderWidth: 2,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Lister.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.surface,
  },
  addPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1.5,
    borderColor: Lister.color.primary,
  },
  addTitle: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.primaryDeep,
  },
});
