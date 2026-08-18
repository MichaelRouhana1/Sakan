import { StyleSheet } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";

type Props = {
  title: string;
  subtitle: string;
};

export function WizardHeadline({ title, subtitle }: Props) {
  return (
    <>
      <LText variant="display" style={styles.title}>
        {title}
      </LText>
      <LText variant="body" tone="muted" style={styles.sub}>
        {subtitle}
      </LText>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Lister.type.displaySerif,
    fontSize: 42,
    lineHeight: 50,
    letterSpacing: -0.8,
  },
  sub: { marginTop: 12, maxWidth: 460, fontSize: 17, lineHeight: 26 },
});
