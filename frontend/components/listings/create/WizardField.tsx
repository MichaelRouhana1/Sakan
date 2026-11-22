import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import type { ReactNode } from "react";
import { StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";

export function useWizardFieldInvalid(field: string): boolean {
  const { fieldInvalid } = useListingForm();
  return fieldInvalid(field);
}

type LabelProps = {
  children: string;
  required?: boolean;
  style?: TextStyle;
};

export function WizardFieldLabel({ children, required, style }: LabelProps) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  const invalid = useWizardFieldInvalid(field);
  return (
    <View style={[style, invalid && styles.groupInvalid]}>
      {children}
    </View>
  );
}

export function wizardInputStyle(
  invalid?: boolean,
  size: (value: number) => number = (value) => value,
): TextStyle {
  return {
    marginTop: size(8),
    borderWidth: invalid ? size(2) : size(1),
    borderColor: invalid ? Lister.color.danger : Lister.color.border,
    borderRadius: size(Lister.radius.md),
    paddingHorizontal: size(14),
    paddingVertical: size(12),
    fontFamily: Lister.type.body,
    fontSize: size(15),
    color: Lister.color.ink,
    backgroundColor: Lister.color.surface,
  };
}

const baseStyles = StyleSheet.create({
  asterisk: { fontFamily: Lister.type.bodySemi },
  groupInvalid: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.dangerSoft,
    padding: 8,
  },
});
