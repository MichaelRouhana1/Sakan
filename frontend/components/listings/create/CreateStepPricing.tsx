import { TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import {
  LEASE_TERM_OPTIONS,
  PAYMENT_MODALITY_OPTIONS,
} from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type { LeaseTerm, PaymentModality } from "@/types/listing";

export function CreateStepPricing() {
  const { draft, patch } = useCreateListingDraft();
  const rentInvalid = useWizardFieldInvalid("monthlyRentUsd");
  const depositInvalid = useWizardFieldInvalid("securityDepositUsd");
  const availableInvalid = useWizardFieldInvalid("availableFrom");

  return (
    <View style={{ gap: 16 }}>
      <Enter>
        <WizardFieldLabel required>Monthly rent (USD)</WizardFieldLabel>
        <TextInput
          accessibilityLabel="Monthly rent in USD"
          keyboardType="number-pad"
          placeholder="650"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.monthlyRentUsd}
          onChangeText={(monthlyRentUsd) => patch({ monthlyRentUsd })}
          style={wizardInputStyle(rentInvalid)}
        />
      </Enter>
      <Enter delay={70}>
        <LText variant="subtitle">Security deposit</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={[
            { value: "none", label: "No deposit" },
            { value: "1", label: "1 month" },
            { value: "2", label: "2 months" },
            { value: "custom", label: "Custom $" },
          ]}
          value={draft.depositPreset}
          onChange={(v) =>
            patch({ depositPreset: v as typeof draft.depositPreset })
          }
        />
        {draft.depositPreset === "custom" ? (
          <>
            <WizardFieldLabel required style={{ marginTop: 8 }}>
              Deposit amount (USD)
            </WizardFieldLabel>
            <TextInput
              accessibilityLabel="Deposit amount in USD"
              keyboardType="number-pad"
              placeholder="Amount in USD"
              placeholderTextColor={Lister.color.inkFaint}
              value={draft.securityDepositUsd}
              onChangeText={(securityDepositUsd) => patch({ securityDepositUsd })}
              style={wizardInputStyle(depositInvalid)}
            />
          </>
        ) : null}
      </Enter>
      <Enter delay={140}>
        <LText variant="subtitle">Minimum lease</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={LEASE_TERM_OPTIONS}
          value={draft.leaseTerm}
          onChange={(v) => patch({ leaseTerm: v as LeaseTerm })}
        />
      </Enter>
      <Enter delay={180}>
        <SelectableCard
          selected={draft.availableImmediate}
          title="Available immediately"
          icon="time-outline"
          onPress={() => patch({ availableImmediate: true, availableFrom: "" })}
        />
        <View style={{ height: 8 }} />
        <WizardFieldLabel required={!draft.availableImmediate}>
          Or a specific date (YYYY-MM-DD)
        </WizardFieldLabel>
        <TextInput
          accessibilityLabel="Available from date"
          placeholder="2026-09-01"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.availableFrom}
          onChangeText={(availableFrom) =>
            patch({ availableFrom, availableImmediate: false })
          }
          style={wizardInputStyle(!draft.availableImmediate && availableInvalid)}
        />
      </Enter>
      <Enter delay={220}>
        <LText variant="subtitle">Payment</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={PAYMENT_MODALITY_OPTIONS}
          value={draft.paymentModality}
          onChange={(v) => patch({ paymentModality: v as PaymentModality })}
        />
      </Enter>
    </View>
  );
}
