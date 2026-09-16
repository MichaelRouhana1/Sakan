import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReportReasonOptions } from "@/components/listings/ReportReasonOptions";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  reportErrorMessage,
  useReportListing,
  type ReportReason,
} from "@/features/reports/useReportListing";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SLIDE_MS = 280;
const THANKS_MS = 1800;
const IS_WEB = Platform.OS === "web";

type Props = {
  listingId: string;
  listingTitle?: string;
  visible: boolean;
  onClose: () => void;
};

type Phase = "pick" | "thanks";

/**
 * Quiet integrity sheet — confidential docket, three fixed reasons.
 * Skoun tokens; no emoji; does not compete with WhatsApp CTA.
 */
export function ReportListingSheet({
  listingId,
  listingTitle,
  visible,
  onClose,
}: Props) {
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
            "Report filed. We’ll review this listing quietly.",
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

  const chosen = Boolean(reason);
  const busy = report.isPending;

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
              <View style={styles.thanksMark}>
                <Ionicons
                  name="checkmark"
                  size={26}
                  color={Skoun.color.primaryDeep}
                />
              </View>
              <LText variant="subtitle">Report filed</LText>
              <LText variant="body" tone="muted" style={styles.thanksBody}>
                We’ll review this listing quietly. Nothing else from you.
              </LText>
            </View>
          ) : (
            <>
              <View style={styles.pill}>
                <Ionicons
                  name="lock-closed"
                  size={11}
                  color={Skoun.color.primaryDeep}
                />
                <LText variant="label" style={styles.pillText}>
                  Confidential
                </LText>
              </View>
              <LText variant="subtitle" style={styles.title}>
                What’s wrong with this listing?
              </LText>
              {listingTitle ? (
                <LText
                  variant="caption"
                  tone="muted"
                  numberOfLines={1}
                  style={styles.listingName}
                >
                  {listingTitle}
                </LText>
              ) : null}
              <LText variant="caption" tone="muted" style={styles.lead}>
                Pick the closest reason. Reports stay private.
              </LText>

              <ReportReasonOptions
                value={reason}
                reduceMotion={reduceMotion}
                onChange={(next) => {
                  setReason(next);
                  setError(null);
                }}
              />

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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="File report"
                  accessibilityState={{ disabled: !chosen || busy }}
                  accessibilityHint="Sends your selected reason"
                  disabled={!chosen || busy}
                  onPress={submit}
                  style={({ pressed }) => [
                    styles.submit,
                    chosen && styles.submitReady,
                    pressed && chosen && styles.submitPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={Skoun.color.surface}
                      size="small"
                    />
                  ) : (
                    <LText
                      variant="subtitle"
                      style={[
                        styles.submitLabel,
                        chosen && styles.submitLabelReady,
                      ]}
                    >
                      File report
                    </LText>
                  )}
                </Pressable>
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
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Skoun.color.borderStrong,
    marginBottom: 4,
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.primaryMist,
    marginTop: 4,
  },
  pillText: {
    letterSpacing: 0.8,
    fontSize: 10,
    lineHeight: 12,
    color: Skoun.color.primaryDeep,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  listingName: {
    marginTop: -4,
  },
  lead: {
    marginBottom: 4,
  },
  error: {
    marginTop: 2,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  submit: {
    minHeight: 52,
    borderRadius: Skoun.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surfaceMuted,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  submitReady: {
    backgroundColor: Skoun.color.primaryDeep,
  },
  submitPressed: {
    opacity: 0.92,
  },
  submitLabel: {
    color: Skoun.color.inkFaint,
  },
  submitLabelReady: {
    color: Skoun.color.surface,
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
  thanksMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
    marginBottom: 4,
  },
  thanksBody: {
    textAlign: "center",
  },
});
