import { StyleSheet, TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { AddNumberButton, LebanonPhoneField } from "@/components/listings/create/LebanonPhoneField";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { Lister } from "@/constants/listerTheme";
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

export function CreateStepContact() {
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

const styles = StyleSheet.create({
  phones: { gap: 10, marginTop: 8 },
});
