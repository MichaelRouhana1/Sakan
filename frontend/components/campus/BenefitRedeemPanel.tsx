import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { TicketBackdrop } from "@/components/campus/TicketBackdrop";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { categoryMeta } from "@/features/benefits/categories";
import { REDEMPTION_META, readyItems } from "@/features/benefits/detailCopy";
import type {
  BenefitRedemption,
  StudentBenefit,
} from "@/features/benefits/types";
import { useBenefitRedemption } from "@/features/benefits/useBenefitRedemption";
import { TICKET_SHADOW, ticketNativeShadow, ticketMaskStyle } from "@/lib/ticketMask";

type Props = {
  benefit: StudentBenefit;
};

const IS_WEB = Platform.OS === "web";
const SUPPORT_EMAIL = "hello@skoun.app";
/** Same bite geometry as the hero ticket and list cards. */
const NOTCH = 24;
const CORNER = 28;

export function BenefitRedeemPanel({ benefit }: Props) {
  const { isSignedIn } = useAuthSession();
  const redemption = useBenefitRedemption(benefit.id);
  const [revealed, setRevealed] = useState<BenefitRedemption | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = REDEMPTION_META[benefit.redemptionType];
  const cat = categoryMeta(benefit.category);
  const ready = readyItems(benefit);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [headH, setHeadH] = useState(0);

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

  const report = () => {
    const subject = encodeURIComponent(
      `Benefit issue: ${benefit.companyName} — ${benefit.title}`,
    );
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(
      () => undefined,
    );
  };

  return (
    <View
      style={[styles.shadowWrap, IS_WEB && styles.shadowWrapWeb]}
      {...(IS_WEB ? ({ className: "skoun-benefit-card-shadow" } as object) : null)}
    >
    <View
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== size.w || h !== size.h) setSize({ w, h });
      }}
      style={[
        styles.ticket,
        ticketMaskStyle({
          w: size.w,
          h: size.h,
          corner: CORNER,
          notch: NOTCH,
          tear: headH > 0 ? { axis: "horizontal", y: headH } : null,
        }),
      ]}
    >
      {!IS_WEB ? (
        <TicketBackdrop
          w={size.w}
          h={size.h}
          corner={CORNER}
          notch={NOTCH}
          tear={{ axis: "horizontal", at: headH || 80 }}
          fill={cat.tint}
          stubFill={Skoun.color.surface}
        />
      ) : null}
      {/* Header stub — category-tinted like the hero's stub */}
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h !== headH) setHeadH(h);
        }}
        style={[styles.head, IS_WEB ? { backgroundColor: cat.tint } : null]}
      >
        <View style={styles.headRow}>
          <View style={styles.iconWell}>
            <Ionicons
              name={isSignedIn ? meta.icon : "lock-closed-outline"}
              size={18}
              color={cat.accent}
            />
          </View>
          <View style={styles.headCopy}>
            <LText variant="label" style={[styles.eyebrow, { color: cat.accent }]}>
              {meta.label}
            </LText>
            <LText variant="subtitle" style={styles.title}>
              {isSignedIn ? "Redeem this offer" : "Sign in to redeem"}
            </LText>
          </View>
        </View>
        <LText variant="caption" style={styles.how}>
          {meta.how(benefit.companyName)}
        </LText>
      </View>

      {/* Perforation */}
      <View
        style={styles.rail}
        pointerEvents="none"
        accessibilityElementsHidden
      >
        <View style={styles.dash} />
      </View>

      <View style={styles.body}>
      <View style={styles.readyBlock}>
        <LText variant="label" tone="muted" style={styles.readyLabel}>
          Have ready
        </LText>
        <View style={styles.readyList}>
          {ready.map((item) => (
            <View key={item} style={styles.readyRow}>
              <Ionicons
                name="checkmark"
                size={14}
                color={Skoun.color.primary}
              />
              <LText variant="body" style={styles.readyText}>
                {item}
              </LText>
            </View>
          ))}
        </View>
      </View>

      {!isSignedIn ? (
        <View style={styles.lockBlock}>
          <LText variant="caption" tone="muted" style={styles.lockNote}>
            Codes and partner links stay behind a student account so partners
            keep honouring them.
          </LText>
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
      ) : revealed ? (
        <View style={styles.revealWrap}>
          {revealed.redemptionType === "promo_code" ? (
            <View style={styles.codeRow}>
              <View style={styles.codeBox}>
                <LText variant="caption" tone="muted" style={styles.codeLabel}>
                  Your code
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
              accessibilityLabel="Open the student offer again"
              style={({ hovered }) => [
                styles.linkBox,
                hovered && styles.linkBoxHover,
              ]}
            >
              <View style={styles.linkCopy}>
                <LText variant="caption" tone="muted" style={styles.codeLabel}>
                  {IS_WEB ? "Opened in a new tab" : "Opened in your browser"}
                </LText>
                <LText
                  variant="body"
                  style={styles.linkText}
                  numberOfLines={2}
                >
                  {revealed.redemptionData.replace(/^https?:\/\//, "")}
                </LText>
              </View>
              <Ionicons
                name="open-outline"
                size={18}
                color={Skoun.color.primary}
              />
            </Pressable>
          ) : (
            <View style={styles.instructionBox}>
              <LText variant="caption" tone="muted" style={styles.codeLabel}>
                At the counter
              </LText>
              <LText variant="body" style={styles.instructionText}>
                {revealed.redemptionData}
              </LText>
            </View>
          )}
        </View>
      ) : (
        <LButton
          label={meta.cta}
          onPress={() => void reveal()}
          loading={redemption.isFetching}
          disabled={redemption.isFetching}
        />
      )}

      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
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

      <View style={styles.divider} />

      <Pressable
        onPress={report}
        accessibilityRole="link"
        accessibilityLabel="Report a problem with this offer by email"
        style={({ hovered }) => [styles.report, hovered && styles.reportHover]}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={14}
          color={Skoun.color.inkMuted}
        />
        <LText variant="caption" tone="muted" style={styles.reportText}>
          Not honoured, or the deal changed? Tell us
        </LText>
      </Pressable>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    width: "100%",
    overflow: "visible",
    ...(IS_WEB ? null : ticketNativeShadow()),
  },
  shadowWrapWeb: {
    ...(IS_WEB
      ? ({ filter: TICKET_SHADOW, WebkitFilter: TICKET_SHADOW } as object)
      : null),
  },
  ticket: {
    width: "100%",
    backgroundColor: IS_WEB ? Skoun.color.surface : "transparent",
    overflow: "visible",
  },

  head: {
    gap: 12,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 24,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  how: {
    color: Skoun.color.inkMuted,
    lineHeight: 19,
  },

  rail: {
    height: 0,
    alignSelf: "stretch",
    position: "relative",
    zIndex: 2,
  },
  dash: {
    position: "absolute",
    left: NOTCH / 2,
    right: NOTCH / 2,
    top: -1,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(197, 205, 216, 0.95)",
  },

  body: {
    gap: 18,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },

  readyBlock: {
    gap: 8,
  },
  readyLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  readyList: {
    gap: 8,
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readyText: {
    flex: 1,
    minWidth: 0,
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  lockBlock: {
    gap: 12,
  },
  lockNote: {
    lineHeight: 18,
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
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 10.5,
    lineHeight: 14,
  },
  codeValue: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.primaryDeep,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.6,
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
    ...(IS_WEB
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
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: "#C5D6F5",
    backgroundColor: Skoun.color.primaryMist,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "border-color",
          transitionDuration: "180ms",
        } as object)
      : null),
  },
  linkBoxHover: {
    borderColor: Skoun.color.primary,
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  linkText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  instructionBox: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  instructionText: {
    color: Skoun.color.ink,
    lineHeight: 23,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  report: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: -4,
    marginBottom: -4,
    paddingVertical: 4,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  reportHover: {
    opacity: 0.7,
  },
  reportText: {
    fontFamily: Skoun.type.bodyMedium,
  },
});
