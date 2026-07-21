import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  reportErrorMessage,
  useReportListing,
  type ReportReason,
} from "@/features/reports/useReportListing";
import { useReducedMotion } from "@/lib/useReducedMotion";

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  {
    value: "fake",
    label: "Fake",
    hint: "Listing looks fabricated or scammy",
  },
  {
    value: "inaccurate_utilities",
    label: "Inaccurate utilities",
    hint: "Electricity, water, or Wi‑Fi don’t match the post",
  },
  {
    value: "already_rented",
    label: "Already rented",
    hint: "Place is taken or no longer available",
  },
];

const SLIDE_MS = 280;
const THANKS_MS = 1600;

type Props = {
  listingId: string;
  visible: boolean;
  onClose: () => void;
};

type Phase = "pick" | "thanks";

/**
 * Quiet integrity sheet — three fixed reasons, select → submit → thank-you.
 * Skoun tokens; no emoji; does not compete with WhatsApp CTA.
 */
export function ReportListingSheet({ listingId, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const report = useReportListing();
  const translateY = useRef(new Animated.Value(420)).current;
  const [mounted, setMounted] = useState(visible);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const thanksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setReason(null);
      setPhase("pick");
      setError(null);
      report.reset();
      translateY.setValue(reduceMotion ? 0 : 420);
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : SLIDE_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(translateY, {
      toValue: 420,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // Intentionally omit `mounted` — including it restarts the open animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, translateY]);

  useEffect(() => {
    return () => {
      if (thanksTimer.current) clearTimeout(thanksTimer.current);
    };
  }, []);

  if (!mounted) return null;

  const dismiss = () => {
    if (thanksTimer.current) {
      clearTimeout(thanksTimer.current);
      thanksTimer.current = null;
    }
    onClose();
  };

  const submit = () => {
    if (!reason || report.isPending) return;
    setError(null);
    report.mutate(
      { listingId, reason },
      {
        onSuccess: () => {
          setPhase("thanks");
          void AccessibilityInfo.announceForAccessibility(
            "Thanks. We received your report.",
          );
          thanksTimer.current = setTimeout(() => {
            thanksTimer.current = null;
            onClose();
          }, THANKS_MS);
        },
        onError: (err) => {
          setError(reportErrorMessage(err));
        },
      },
    );
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss report sheet"
          onPress={dismiss}
          style={styles.backdrop}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} accessibilityElementsHidden />

          {phase === "thanks" ? (
            <View style={styles.thanks} accessibilityLiveRegion="polite">
              <View style={styles.thanksIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={Skoun.color.primary}
                />
              </View>
              <LText variant="subtitle">Thanks — we got it</LText>
              <LText variant="body" tone="muted" style={styles.thanksBody}>
                Your report helps keep Skoun trustworthy. No further action
                needed from you.
              </LText>
            </View>
          ) : (
            <>
              <LText variant="subtitle" style={styles.title}>
                Report listing
              </LText>
              <LText variant="caption" tone="muted" style={styles.lead}>
                Choose one reason. We review quietly — this won’t message the
                landlord.
              </LText>

              <View
                accessibilityLabel="Report reason"
                style={styles.reasons}
              >
                {REASONS.map((item) => {
                  const selected = reason === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={item.label}
                      accessibilityHint={item.hint}
                      onPress={() => {
                        setReason(item.value);
                        setError(null);
                      }}
                      style={({ pressed }) => [
                        styles.reasonRow,
                        selected && styles.reasonRowSelected,
                        pressed && styles.reasonRowPressed,
                      ]}
                    >
                      <Ionicons
                        name={
                          selected ? "checkmark-circle" : "ellipse-outline"
                        }
                        size={22}
                        color={
                          selected
                            ? Skoun.color.primary
                            : Skoun.color.inkFaint
                        }
                      />
                      <View style={styles.reasonCopy}>
                        <LText
                          variant="body"
                          style={selected ? styles.reasonLabelOn : undefined}
                        >
                          {item.label}
                        </LText>
                        <LText variant="caption" tone="muted">
                          {item.hint}
                        </LText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {error ? (
                <LText
                  variant="caption"
                  tone="danger"
                  style={styles.error}
                  accessibilityRole="alert"
                >
                  {error}
                </LText>
              ) : null}

              <View style={styles.actions}>
                <LButton
                  label="Submit report"
                  variant="secondary"
                  disabled={!reason}
                  loading={report.isPending}
                  onPress={submit}
                  accessibilityHint="Sends your selected reason"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={dismiss}
                  style={({ pressed }) => [
                    styles.cancel,
                    pressed && styles.cancelPressed,
                  ]}
                >
                  <LText variant="caption" tone="muted">
                    Cancel
                  </LText>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
  },
  sheet: {
    backgroundColor: Skoun.color.surface,
    borderTopLeftRadius: Skoun.radius.xl,
    borderTopRightRadius: Skoun.radius.xl,
    borderTopWidth: 1,
    borderColor: Skoun.color.border,
    paddingHorizontal: Skoun.space.lg,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Skoun.color.borderStrong,
    marginBottom: 4,
  },
  title: {
    marginTop: 4,
  },
  lead: {
    marginBottom: 4,
  },
  reasons: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  reasonRowSelected: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  reasonRowPressed: {
    opacity: 0.92,
  },
  reasonCopy: {
    flex: 1,
    gap: 2,
  },
  reasonLabelOn: {
    fontFamily: Skoun.type.bodySemi,
  },
  error: {
    marginTop: 2,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  cancel: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelPressed: {
    opacity: 0.7,
  },
  thanks: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  thanksIcon: {
    marginBottom: 4,
  },
  thanksBody: {
    textAlign: "center",
  },
});
