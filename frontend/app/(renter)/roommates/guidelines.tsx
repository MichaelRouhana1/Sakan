import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

export default function RoommateGuidelinesScreen() {
  return (
    <ListerScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LText variant="label" tone="brass">
          Trust
        </LText>
        <LText variant="display">Roommate guidelines</LText>
        <LText variant="body" tone="muted" style={styles.p}>
          Roommate Finder is for sharing housing — not dating. Keep messages
          about the place, rent, and living habits.
        </LText>
        <LText variant="subtitle" style={styles.h}>
          Same gender only
        </LText>
        <LText variant="body" tone="muted" style={styles.p}>
          Discovery is filtered by a private gender field. Gender is never shown
          on Looking cards.
        </LText>
        <LText variant="subtitle" style={styles.h}>
          Contact unlock
        </LText>
        <LText variant="body" tone="muted" style={styles.p}>
          Phone and photos stay hidden until both sides accept. Ending a match
          hides contact in Skoun; WhatsApp on your phone is unchanged.
        </LText>
        <LText variant="subtitle" style={styles.h}>
          Report & block
        </LText>
        <LText variant="body" tone="muted" style={styles.p}>
          Report spam, harassment, or fake profiles. Blocking removes someone
          from your Roommate Finder views.
        </LText>
        <LButton
          label="Got it"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  p: { marginTop: 10, marginBottom: 4 },
  h: { marginTop: 16, color: Skoun.color.ink },
});
