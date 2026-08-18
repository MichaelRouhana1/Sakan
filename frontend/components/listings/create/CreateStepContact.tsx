import { TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type { ListingPosterRole } from "@/types/listing";

export function CreateStepContact() {
  const { draft, patch } = useCreateListingDraft();
  const roleInvalid = useWizardFieldInvalid("listingPosterRole");
  const nameInvalid = useWizardFieldInvalid("contactName");
  const phoneInvalid = useWizardFieldInvalid("contactPhone");

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
        <WizardFieldLabel required>Phone (+961)</WizardFieldLabel>
        <TextInput
          accessibilityLabel="Contact phone"
          keyboardType="phone-pad"
          placeholder="71 123 456"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.contactPhone}
          onChangeText={(contactPhone) => patch({ contactPhone })}
          style={wizardInputStyle(phoneInvalid)}
        />
      </Enter>
      <Enter delay={180}>
        <SelectableCard
          selected={draft.whatsappSameAsPhone}
          title="Use this number for WhatsApp"
          icon="logo-whatsapp"
          onPress={() =>
            patch({ whatsappSameAsPhone: !draft.whatsappSameAsPhone })
          }
        />
        {!draft.whatsappSameAsPhone ? (
          <TextInput
            accessibilityLabel="WhatsApp number"
            keyboardType="phone-pad"
            placeholder="WhatsApp number"
            placeholderTextColor={Lister.color.inkFaint}
            value={draft.whatsappNumber}
            onChangeText={(whatsappNumber) => patch({ whatsappNumber })}
            style={wizardInputStyle()}
          />
        ) : null}
      </Enter>
    </View>
  );
}
