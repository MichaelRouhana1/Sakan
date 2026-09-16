import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ReportReasonOptions } from "@/components/listings/ReportReasonOptions";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  reportErrorMessage,
  useReportListing,
  type ReportReason,
} from "@/features/reports/useReportListing";
import { useReducedMotion } from "@/lib/useReducedMotion";

const IS_WEB = Platform.OS === "web";
const THANKS_MS = 1800;

type Props = {
  listingId: string;
  listingTitle?: string;
  visible: boolean;
  onClose: () => void;
};

export function ReportListingDialog({
  listingId,
  listingTitle,
  visible,
  onClose,
}: Props) {
  const report = useReportListing();
  const reduceMotion = useReducedMotion();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thanksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setReason(null);
    setThanks(false);
    setError(null);
    report.reset();
    if (thanksTimer.current) {
      clearTimeout(thanksTimer.current);
      thanksTimer.current = null;
    }
    // Intentionally omit `report` — identity changes every mutation tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, listingId]);

  useEffect(() => {
    return () => {
      if (thanksTimer.current) clearTimeout(thanksTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible || typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const submit = async () => {
    if (!reason) return;
    setError(null);
    try {
      await report.mutateAsync({ listingId, reason });
      setThanks(true);
      thanksTimer.current = setTimeout(onClose, THANKS_MS);
    } catch (e) {
      setError(reportErrorMessage(e));
    }
  };

  const chosen = Boolean(reason);
  const busy = report.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close report dialog"
        />
        <View
          style={styles.dialog}
          accessibilityViewIsModal
          accessibilityRole="dialog"
          accessibilityLabel="Flag this listing"
        >
          {thanks ? (
            <View style={styles.thanks} accessibilityLiveRegion="polite">
              <View style={styles.thanksMark}>
                <Ionicons
                  name="checkmark"
                  size={28}
                  color={Skoun.color.primaryDeep}
                />
              </View>
              <LText variant="title" style={styles.thanksTitle}>
                Report filed
              </LText>
              <LText variant="body" tone="muted" style={styles.thanksBody}>
                We’ll review this listing quietly. Nothing else from you.
              </LText>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headerCopy}>
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
                  <LText variant="title" style={styles.headline}>
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
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  style={({ hovered, focused }) => [
                    styles.close,
                    hovered && styles.closeHover,
                    focused && styles.closeFocus,
                  ]}
                >
                  <Ionicons name="close" size={18} color={Skoun.color.ink} />
                </Pressable>
              </View>

              <LText variant="body" tone="muted" style={styles.lead}>
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
                <View style={styles.errorRow} accessibilityRole="alert">
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={Skoun.color.danger}
                  />
                  <LText variant="caption" tone="danger" style={styles.errorText}>
                    {error}
                  </LText>
                </View>
              ) : null}

              <View style={styles.footer}>
                <View style={styles.reassure}>
                  <Ionicons
                    name="eye-off-outline"
                    size={16}
                    color={Skoun.color.inkFaint}
                  />
                  <LText variant="caption" tone="muted" style={styles.reassureText}>
                    Landlord isn’t notified
                  </LText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="File report"
                  accessibilityState={{ disabled: !chosen || busy }}
                  accessibilityHint="Sends your selected reason"
                  disabled={!chosen || busy}
                  onPress={() => void submit()}
                  style={({ hovered, focused }) => [
                    styles.submit,
                    chosen && styles.submitReady,
                    chosen && hovered && !busy && styles.submitHover,
                    focused && chosen && styles.closeFocus,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={Skoun.color.surface}
                      size="small"
                    />
                  ) : (
                    <>
                      <LText
                        variant="subtitle"
                        style={[
                          styles.submitLabel,
                          chosen && styles.submitLabelReady,
                        ]}
                      >
                        File report
                      </LText>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={
                          chosen ? Skoun.color.surface : Skoun.color.inkFaint
                        }
                        accessibilityElementsHidden
                      />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
    ...(IS_WEB
      ? ({
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          cursor: "pointer",
        } as object)
      : null),
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: Skoun.color.surface,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
    borderWidth: 1,
    borderTopWidth: 5,
    borderColor: Skoun.color.border,
    borderTopColor: Skoun.color.primaryDeep,
    overflow: "hidden",
    zIndex: 1,
    ...(IS_WEB
      ? ({
          boxShadow: "0 28px 64px rgba(18, 24, 38, 0.22)",
        } as object)
      : null),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
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
  },
  pillText: {
    letterSpacing: 0.8,
    fontSize: 10,
    lineHeight: 12,
    color: Skoun.color.primaryDeep,
  },
  headline: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  listingName: {
    marginTop: -2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surfaceMuted,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  closeHover: {
    backgroundColor: Skoun.color.bgWash,
  },
  closeFocus: {
    ...(IS_WEB
      ? ({
          outlineWidth: 2,
          outlineStyle: "solid",
          outlineColor: Skoun.color.primary,
          outlineOffset: 2,
        } as object)
      : null),
  },
  lead: {
    marginBottom: 16,
    lineHeight: 22,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.dangerSoft,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reassure: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  reassureText: {
    flex: 1,
  },
  submit: {
    minHeight: 44,
    minWidth: 148,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Skoun.color.surfaceMuted,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, box-shadow",
          transitionDuration: "200ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  submitReady: {
    backgroundColor: Skoun.color.primaryDeep,
    ...(IS_WEB
      ? ({ boxShadow: "0 8px 18px rgba(18, 24, 38, 0.18)" } as object)
      : null),
  },
  submitHover: {
    backgroundColor: "#1C2433",
  },
  submitLabel: {
    fontSize: 15,
    color: Skoun.color.inkFaint,
  },
  submitLabelReady: {
    color: Skoun.color.surface,
  },
  thanks: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 8,
    gap: 10,
  },
  thanksMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
    marginBottom: 8,
  },
  thanksTitle: {
    textAlign: "center",
  },
  thanksBody: {
    textAlign: "center",
    maxWidth: 320,
  },
});
