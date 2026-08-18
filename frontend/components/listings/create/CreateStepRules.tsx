import { View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type {
  GenderRestriction,
  GuestsPolicy,
  PetsPolicy,
  SmokingPolicy,
  TargetAudience,
} from "@/types/listing";

export function CreateStepRules() {
  const { draft, patch } = useCreateListingDraft();
  return (
    <View style={{ gap: 16 }}>
      <Enter>
        <LText variant="subtitle">Gender</LText>
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.genderRestriction === "anyone"}
          title="All / mixed"
          body="No gender restriction."
          icon="people-outline"
          onPress={() => patch({ genderRestriction: "anyone" as GenderRestriction })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.genderRestriction === "girls_only"}
          title="Female only"
          icon="woman-outline"
          onPress={() => patch({ genderRestriction: "girls_only" })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.genderRestriction === "boys_only"}
          title="Male only"
          icon="man-outline"
          onPress={() => patch({ genderRestriction: "boys_only" })}
        />
      </Enter>
      <Enter delay={80}>
        <LText variant="subtitle">Tenant mix</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={[
            { value: "students_only", label: "Students only" },
            { value: "students_professionals", label: "Students & professionals" },
            { value: "anyone", label: "Families / anyone" },
          ]}
          value={draft.targetAudience}
          onChange={(v) => patch({ targetAudience: v as TargetAudience })}
        />
      </Enter>
      <Enter delay={140}>
        <LText variant="subtitle">Smoking</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={[
            { value: "no", label: "No" },
            { value: "balcony_only", label: "Balcony only" },
            { value: "inside", label: "Inside OK" },
          ]}
          value={draft.smokingPolicy}
          onChange={(v) => patch({ smokingPolicy: v as SmokingPolicy })}
        />
      </Enter>
      <Enter delay={180}>
        <LText variant="subtitle">Pets</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={[
            { value: "no", label: "No" },
            { value: "cats_only", label: "Cats only" },
            { value: "yes", label: "Yes" },
          ]}
          value={draft.petsPolicy}
          onChange={(v) => patch({ petsPolicy: v as PetsPolicy })}
        />
      </Enter>
      <Enter delay={220}>
        <LText variant="subtitle">Overnight guests</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={[
            { value: "yes", label: "Yes" },
            { value: "restricted", label: "Restricted" },
            { value: "no", label: "No" },
          ]}
          value={draft.guestsPolicy}
          onChange={(v) => patch({ guestsPolicy: v as GuestsPolicy })}
        />
      </Enter>
      <Enter delay={260}>
        <SelectableCard
          selected={draft.quietHours}
          title="Quiet study hours"
          body="Enforced quiet hours in the evening."
          icon="moon-outline"
          onPress={() => patch({ quietHours: !draft.quietHours })}
        />
      </Enter>
    </View>
  );
}
