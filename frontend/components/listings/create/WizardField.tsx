import type { ReactNode } from "react";
import { StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";

export function useWizardFieldInvalid(field: string): boolean {
  const { fieldInvalid } = useCreateListingDraft();
  return fieldInvalid(field);
}

type LabelProps = {
  children: string;
  required?: boolean;
  style?: TextStyle;
};

export function WizardFieldLabel({ children, required, style }: LabelProps) {
  return (
    <LText variant="subtitle" style={style}>
      {children}
      {required ? (
        <LText variant="subtitle" tone="danger" style={styles.asterisk}>
          {" *"}
        </LText>
      ) : null}
    </LText>
  );
}

type GroupProps = {
  field: string;
  children: ReactNode;
  style?: ViewStyle;
};

export function WizardFieldGroup({ field, children, style }: GroupProps) {
  const invalid = useWizardFieldInvalid(field);
  return (
    <View style={[style, invalid && styles.groupInvalid]}>
      {children}
    </View>
  );
}

export function wizardInputStyle(invalid?: boolean): ViewStyle {
  return {
    marginTop: 8,
    borderWidth: invalid ? 2 : 1,
    borderColor: invalid ? Lister.color.danger : Lister.color.border,
    borderRadius: Lister.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
    backgroundColor: Lister.color.surface,
  };
}

const styles = StyleSheet.create({
  asterisk: { fontFamily: Lister.type.bodySemi },
  groupInvalid: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.dangerSoft,
    padding: 8,
  },
});
