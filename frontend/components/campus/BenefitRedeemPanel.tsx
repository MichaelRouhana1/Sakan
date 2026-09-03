import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import type {
  BenefitRedemption,
  StudentBenefit,
} from "@/features/benefits/types";
import { useBenefitRedemption } from "@/features/benefits/useBenefitRedemption";

type Props = {
  benefit: StudentBenefit;
};

const CTA_LABEL: Record<StudentBenefit["redemptionType"], string> = {
  promo_code: "Reveal my code",
  link: "Open the student offer",
  show_id: "Show me how to redeem",
};

const CTA_ICON: Record<
  StudentBenefit["redemptionType"],
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  promo_code: "pricetag-outline",
  link: "open-outline",
  show_id: "card-outline",
};

export function BenefitRedeemPanel({ benefit }: Props) {
  const { isSignedIn } = useAuthSession();
  const redemption = useBenefitRedemption(benefit.id);
  const [revealed, setRevealed] = useState<BenefitRedemption | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signing out mid-visit must put the payoff back behind the gate.
  useEffect(() => {
    if (!isSignedIn) setRevealed(null);
  }, [isSignedIn]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const reveal = async () => {
    setError(null);
    try {
      const result = await redemption.refetch({ throwOnError: true });
      const data = result.data;
      if (!data) {
        setError("Could not load this offer. Try again.");
        return;
      }
      setRevealed(data);
      if (data.redemptionType === "link") {
        void Linking.openURL(data.redemptionData).catch(() => undefined);
      }
    } catch {
      setError("Could not load this offer. Try again.");
    }
  };

  const copyCode = async () => {
    if (!revealed) return;
    try {
      await Clipboard.setStringAsync(revealed.redemptionData);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the code and copy it manually.");
    }
  };

  if (!isSignedIn) {
    return (
      <View style={[styles.panel, styles.panelLocked]}>
        <View style={styles.lockRow}>
          <View style={styles.lockWell}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Skoun.color.primary}
            />
          </View>
          <View style={styles.lockCopy}>
            <LText variant="subtitle" style={styles.panelTitle}>
              Sign in to unlock this offer
            </LText>
            <LText variant="body" tone="muted">
              Skoun keeps redemption codes and partner links behind a student
              account so partners honour them.
            </LText>
          </View>
        </View>
        <LButton
          label="Sign in to unlock"
          onPress={() => setAuthOpen(true)}
          accessibilityHint="Opens the Skoun sign-in dialog"
        />
        <SkounAuthModal
          visible={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => setAuthOpen(false)}
          title="Sign in to unlock student benefits"
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.lockRow}>
        <View style={styles.lockWell}>
          <Ionicons
            name={CTA_ICON[benefit.redemptionType]}
            size={18}
            color={Skoun.color.primary}
          />
        </View>
        <View style={styles.lockCopy}>
          <LText variant="subtitle" style={styles.panelTitle}>
            How to redeem
          </LText>
          <LText variant="body" tone="muted">
            {benefit.eligibility}
          </LText>
        </View>
      </View>

      {revealed ? (
        <View style={styles.revealWrap}>
          {revealed.redemptionType === "promo_code" ? (
            <View style={styles.codeRow}>
              <View style={styles.codeBox}>
                <LText variant="caption" tone="muted" style={styles.codeLabel}>
                  Promo code
                </LText>
                <LText
                  variant="subtitle"
                  style={styles.codeValue}
                  selectable
                  accessibilityLabel={`Promo code ${revealed.redemptionData}`}
                >
                  {revealed.redemptionData}
                </LText>
              </View>
              <Pressable
                onPress={() => void copyCode()}
                accessibilityRole="button"
                accessibilityLabel="Copy promo code"
                style={({ hovered, pressed }) => [
                  styles.copyBtn,
                  (hovered || pressed) && styles.copyBtnActive,
                ]}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={Skoun.color.primary}
                />
                <LText variant="caption" style={styles.copyLabel}>
                  {copied ? "Copied" : "Copy"}
                </LText>
              </Pressable>
            </View>
          ) : revealed.redemptionType === "link" ? (
            <Pressable
              onPress={() =>
                void Linking.openURL(revealed.redemptionData).catch(
                  () => undefined,
                )
              }
              accessibilityRole="link"
              accessibilityLabel="Open the student offer"
              style={({ hovered }) => [
                styles.linkBox,
                hovered && styles.linkBoxHover,
              ]}
            >
              <Ionicons
                name="open-outline"
                size={16}
                color={Skoun.color.primary}
              />
              <LText variant="body" style={styles.linkText} numberOfLines={2}>
                {revealed.redemptionData}
              </LText>
            </Pressable>
          ) : (
            <View style={styles.instructionBox}>
              <LText variant="body" style={styles.instructionText}>
                {revealed.redemptionData}
              </LText>
            </View>
          )}
        </View>
      ) : (
        <LButton
          label={CTA_LABEL[benefit.redemptionType]}
          onPress={() => void reveal()}
          loading={redemption.isFetching}
          disabled={redemption.isFetching}
        />
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={Skoun.color.danger}
          />
          <LText variant="caption" tone="danger">
            {error}
          </LText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 16,
    padding: 20,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 4px 18px rgba(18, 24, 38, 0.06)" } as object)
      : null),
  },
  panelLocked: {
    borderColor: "#C5D6F5",
    backgroundColor: Skoun.color.primaryMist,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  lockWell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: "#D9E3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  lockCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  panelTitle: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  revealWrap: {
    gap: 10,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  codeBox: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  codeLabel: {
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
  },
  codeValue: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.primaryDeep,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  copyBtn: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, border-color",
          transitionDuration: "180ms",
        } as object)
      : null),
  },
  copyBtnActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  copyLabel: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: "#C5D6F5",
    backgroundColor: Skoun.color.primaryMist,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  linkBoxHover: {
    borderColor: Skoun.color.primary,
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyMedium,
  },
  instructionBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  instructionText: {
    color: Skoun.color.ink,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
