import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  reportErrorMessage,
  useReportListing,
  type ReportReason,
} from "@/features/reports/useReportListing";

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "fake", label: "Fake", hint: "Listing looks fabricated or scammy" },
  {
    value: "inaccurate_utilities",
    label: "Inaccurate utilities",
    hint: "Electricity, water, or Wi‑Fi don’t match",
  },
  {
    value: "already_rented",
    label: "Already rented",
    hint: "Place is taken or unavailable",
  },
];

type Props = {
  listingId: string;
  visible: boolean;
  onClose: () => void;
};

export function ReportListingDialog({ listingId, visible, onClose }: Props) {
  const report = useReportListing();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setReason(null);
    setThanks(false);
    setError(null);
    report.reset();
  }, [visible, listingId]);

  const submit = async () => {
    if (!reason) return;
    setError(null);
    try {
      await report.mutateAsync({ listingId, reason });
      setThanks(true);
      setTimeout(onClose, 1400);
    } catch (e) {
      setError(reportErrorMessage(e));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.header}>
            <LText variant="title">Report listing</LText>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Ionicons name="close" size={22} color={Skoun.color.inkMuted} />
            </Pressable>
          </View>

          {thanks ? (
            <View style={styles.thanks}>
              <Ionicons name="checkmark-circle" size={40} color={Skoun.color.primary} />
              <LText variant="body" style={styles.thanksText}>
                Thanks — we’ll review this listing.
              </LText>
            </View>
          ) : (
            <>
              <LText variant="body" tone="muted" style={styles.intro}>
                Pick the closest reason. Reports are confidential.
              </LText>
              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setReason(r.value)}
                      style={({ hovered }) => [
                        styles.reason,
                        selected && styles.reasonSelected,
                        hovered && !selected && styles.reasonHover,
                      ]}
                    >
                      <LText variant="subtitle">{r.label}</LText>
                      <LText variant="caption" tone="muted">
                        {r.hint}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
              {error ? (
                <LText variant="caption" style={styles.error}>
                  {error}
                </LText>
              ) : null}
              <LButton
                label={report.isPending ? "Submitting…" : "Submit report"}
                variant="primary"
                disabled={!reason || report.isPending}
                onPress={() => void submit()}
              />
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
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    boxShadow: "0 20px 40px rgba(18, 24, 38, 0.12)",
    zIndex: 1,
  } as Record<string, unknown>,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  intro: {
    marginBottom: 16,
    lineHeight: 22,
  },
  reasons: {
    gap: 8,
    marginBottom: 16,
  },
  reason: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
    gap: 2,
  },
  reasonSelected: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  reasonHover: {
    borderColor: Skoun.color.borderStrong,
  },
  error: {
    color: Skoun.color.danger,
    marginBottom: 12,
  },
  thanks: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  thanksText: {
    textAlign: "center",
  },
});
