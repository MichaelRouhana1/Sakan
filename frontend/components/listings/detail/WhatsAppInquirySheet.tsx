import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  AccessibilityInfo, ActivityIndicator, findNodeHandle, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput,
  useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LText } from "@/components/lister/Typography";
import { WhatsAppMessagePreview } from "@/components/listings/detail/WhatsAppMessagePreview";
import { Skoun } from "@/constants/theme";
import type { WhatsAppInquiryController } from "@/features/listings/useWhatsAppInquiry";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { WhatsAppInquiryAnswers } from "@/lib/whatsapp";

const FIELDS: { key: keyof WhatsAppInquiryAnswers; label: string; placeholder: string }[] = [
  { key: "moveInDate", label: "Move-in date", placeholder: "e.g. mid-November" },
  { key: "household", label: "Who’s moving in (count / students or work)", placeholder: "e.g. 2 students" },
  { key: "rentAcceptance", label: "OK with listed rent + what’s included?", placeholder: "e.g. Yes, or ask about utilities" },
];

export function WhatsAppInquirySheet({ inquiry }: { inquiry: WhatsAppInquiryController }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const heading = useRef<View>(null);
  const dialogRef = useRef<View>(null);
  const desktop = Platform.OS === "web" && width >= 900;
  const { visible, close, answers, setAnswer, message, underOffer, isOpening, error, submit } = inquiry;

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;
    // RN Web's outer Modal trap can focus its wrapper at the tab boundary.
    // Keep keyboard navigation on the actual dialog's visible controls instead.
    const containTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current as unknown as HTMLElement | null;
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, input, textarea, select, a[href], [tabindex]',
      )).filter((node) => node.tabIndex >= 0 && !node.hasAttribute("disabled") &&
        node.getAttribute("aria-disabled") !== "true" && node.getClientRects().length > 0);
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (index < 0 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        const next = event.shiftKey ? controls.at(-1) : controls[0];
        (next ?? (heading.current as unknown as HTMLElement | null))?.focus();
      }
    };
    document.addEventListener("keydown", containTab, true);
    return () => document.removeEventListener("keydown", containTab, true);
  }, [visible]);

  const focusHeading = () => {
    if (Platform.OS === "web") {
      (heading.current as unknown as HTMLElement | null)?.focus();
    } else {
      const node = findNodeHandle(heading.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }
  };

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={close} onShow={focusHeading} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.overlay, desktop && styles.desktopOverlay]}>
        <Pressable testID="whatsapp-inquiry-backdrop" onPress={close} accessible={false} focusable={false} style={styles.backdrop} />
        <View
          ref={dialogRef}
          testID="whatsapp-inquiry-dialog"
          accessibilityViewIsModal
          role="dialog"
          accessibilityLabel="Introduce yourself"
          style={[styles.sheet, desktop && styles.desktopSheet, { maxHeight: height - Math.max(insets.top, 16) - (desktop ? 32 : 0), paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          {!desktop && <View accessible={false} style={styles.handle} />}
          <View style={styles.header}>
            <View ref={heading} accessible accessibilityRole="header" accessibilityLabel="Introduce yourself. Add a few details for the host. Everything is optional." tabIndex={-1} style={styles.heading}>
              <LText variant="title">Introduce yourself</LText>
              <LText tone="muted" style={styles.subtitle}>Add a few details for the host. Everything is optional.</LText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close inquiry" onPress={close} style={styles.close}>
              <Ionicons name="close" size={22} color={Skoun.color.ink} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {underOffer && <LText style={styles.note}>This listing is under offer. You can still contact the host.</LText>}
            {FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} style={styles.field}>
                <LText nativeID={`inquiry-${key}-label`} style={styles.label}>{label} <LText variant="caption" tone="muted">(optional)</LText></LText>
                <TextInput
                  testID={`whatsapp-inquiry-${key}`}
                  accessibilityLabel={label}
                  accessibilityLabelledBy={`inquiry-${key}-label`}
                  value={answers[key] ?? ""}
                  onChangeText={(value) => setAnswer(key, value)}
                  placeholder={placeholder}
                  placeholderTextColor={Skoun.color.inkMuted}
                  editable={!isOpening}
                  style={styles.input}
                />
              </View>
            ))}
            <View style={styles.preview}>
              <LText variant="label" tone="muted">Message preview</LText>
              <WhatsAppMessagePreview message={message} />
            </View>
          </ScrollView>
          <View style={styles.actions}>
            {error && <LText accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</LText>}
            <Pressable accessibilityRole="button" accessibilityLabel="Open WhatsApp" accessibilityState={{ disabled: isOpening, busy: isOpening }} disabled={isOpening} onPress={() => void submit()} style={[styles.primary, isOpening && styles.disabled]}>
              {isOpening ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />}
              <LText variant="subtitle" style={styles.primaryText}>{isOpening ? "Opening…" : "Open WhatsApp"}</LText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip — message anyway" accessibilityHint="Opens WhatsApp without the answers you entered" accessibilityState={{ disabled: isOpening }} disabled={isOpening} onPress={() => void submit(true)} style={styles.skip}>
              <LText style={styles.skipText}>Skip — message anyway</LText>
            </Pressable>
            <LText variant="caption" tone="muted" style={styles.skipHint}>Skip leaves out your answers. You can edit the message in WhatsApp.</LText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  desktopOverlay: { justifyContent: "center", alignItems: "center", padding: 24 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Skoun.color.overlay },
  sheet: { width: "100%", flexShrink: 1, backgroundColor: Skoun.color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  desktopSheet: { maxWidth: 580, borderRadius: 24, borderWidth: 1, borderColor: Skoun.color.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Skoun.color.border, alignSelf: "center", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  heading: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  close: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 22, backgroundColor: Skoun.color.surfaceMuted },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  field: { gap: 7 },
  label: { fontFamily: Skoun.type.bodyMedium, fontSize: 14, lineHeight: 21 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Skoun.color.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Skoun.color.surface, color: Skoun.color.ink, fontFamily: Skoun.type.body, fontSize: 16 },
  note: { backgroundColor: Skoun.color.warningSoft, color: Skoun.color.warning, borderRadius: 10, padding: 12, fontSize: 14 },
  preview: { gap: 9, marginTop: 4 },
  error: { color: Skoun.color.danger, backgroundColor: Skoun.color.dangerSoft, padding: 12, borderRadius: 10, marginBottom: 10 },
  actions: { borderTopWidth: 1, borderTopColor: Skoun.color.border, paddingHorizontal: 20, paddingTop: 14 },
  primary: { minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: Skoun.color.primary, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  primaryText: { color: "#FFFFFF" },
  disabled: { opacity: 0.65 },
  skip: { minHeight: 44, justifyContent: "center", alignItems: "center", paddingVertical: 10 },
  skipText: { color: Skoun.color.primary, fontFamily: Skoun.type.bodySemi },
  skipHint: { textAlign: "center", paddingBottom: 6 },
});
