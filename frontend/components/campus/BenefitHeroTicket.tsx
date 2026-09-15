import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { stubStamp } from "@/components/campus/BenefitCard";
import { TicketBackdrop } from "@/components/campus/TicketBackdrop";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import {
  isCampusExclusive,
  type StudentBenefit,
} from "@/features/benefits/types";
import { benefitCompanyLogo } from "@/lib/benefitCompanyLogos";
import { TICKET_SHADOW, ticketNativeShadow, ticketMaskStyle } from "@/lib/ticketMask";

type Props = {
  benefit: StudentBenefit;
  /** Below this the stub drops under the body and the tear runs horizontally. */
  stack: boolean;
  compact: boolean;
};

const IS_WEB = Platform.OS === "web";
/** Same bite geometry as BenefitCard so the hero reads as the "same ticket, bigger". */
const NOTCH = 24;
const CORNER = 28;
const STUB_W = 212;
const STUB_STACK_H = 92;

function ticketMask(stack: boolean, w: number, h: number): object {
  return ticketMaskStyle({
    w,
    h,
    corner: CORNER,
    notch: NOTCH,
    tear: stack
      ? { axis: "horizontal", y: h - STUB_STACK_H }
      : { axis: "vertical", x: w - STUB_W },
  });
}

function stampSize(stamp: string): number {
  if (stamp.length <= 4) return 30;
  if (stamp.length <= 6) return 24;
  return 20;
}

export function BenefitHeroTicket({ benefit, stack, compact }: Props) {
  const meta = categoryMeta(benefit.category);
  const exclusive = isCampusExclusive(benefit);
  const logo = benefitCompanyLogo(benefit.companyName);
  const stamp = stubStamp(benefit.title);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [stubH, setStubH] = useState(0);

  const holderLabel = exclusive
    ? benefit.applicableUniversities.join(" · ")
    : benefit.isGlobal
      ? "Any university"
      : "Lebanon students";

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
          ticketMask(stack, size.w, size.h),
          stack ? styles.ticketStack : styles.ticketRow,
        ]}
      >
        {!IS_WEB ? (
          <TicketBackdrop
            w={size.w}
            h={size.h}
            corner={CORNER}
            notch={NOTCH}
            tear={
              stack
                ? { axis: "horizontal", at: size.h - (stubH || STUB_STACK_H) }
                : { axis: "vertical", at: size.w - STUB_W }
            }
            fill={Skoun.color.surface}
            stubFill={meta.tint}
          />
        ) : null}
        {/* Body */}
        <View style={[styles.body, compact && styles.bodyCompact]}>
          <View style={[styles.brandRow, compact && styles.brandRowCompact]}>
            <View
              style={[
                styles.logoWell,
                compact && styles.logoWellCompact,
                logo ? styles.logoWellImg : { backgroundColor: meta.tint },
              ]}
            >
              {logo ? (
                <Image
                  source={logo}
                  style={compact ? styles.logoImgCompact : styles.logoImg}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Ionicons
                  name={meta.icon}
                  size={compact ? 24 : 30}
                  color={meta.accent}
                />
              )}
            </View>
            <View style={styles.copy}>
              <LText
                variant="label"
                style={[styles.company, { color: meta.accent }]}
              >
                {benefit.companyName}
              </LText>
              <LText
                variant="display"
                accessibilityRole="header"
                style={[styles.title, compact && styles.titleCompact]}
              >
                {benefit.title}
              </LText>
            </View>
          </View>

          <View style={styles.chipRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: meta.tint, borderColor: meta.tint },
              ]}
            >
              <Ionicons name={meta.icon} size={12} color={meta.accent} />
              <LText
                variant="caption"
                style={[styles.chipText, { color: meta.accent }]}
              >
                {meta.label}
              </LText>
            </View>
            <View style={styles.chip}>
              <Ionicons
                name={benefit.isGlobal ? "globe-outline" : "flag-outline"}
                size={12}
                color={Skoun.color.inkMuted}
              />
              <LText variant="caption" style={styles.chipText}>
                {benefit.isGlobal ? "Global offer" : "Lebanon only"}
              </LText>
            </View>
            {exclusive ? (
              <View style={[styles.chip, styles.chipExclusive]}>
                <Ionicons
                  name="school-outline"
                  size={12}
                  color={Skoun.color.primary}
                />
                <LText
                  variant="caption"
                  style={[styles.chipText, styles.chipTextExclusive]}
                >
                  Campus exclusive
                </LText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Perforation */}
        <View
          style={stack ? styles.railHorizontal : styles.railVertical}
          pointerEvents="none"
          accessibilityElementsHidden
        >
          <View
            style={[
              styles.dash,
              stack ? styles.dashHorizontal : styles.dashVertical,
            ]}
          />
        </View>

        {/* Stub — category-tinted, carries the value and who it's for */}
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h !== stubH) setStubH(h);
          }}
          style={[
            styles.stub,
            stack ? styles.stubStack : styles.stubRow,
            IS_WEB ? { backgroundColor: meta.tint } : null,
          ]}
        >
          <View style={[styles.stampBadge, { borderColor: meta.accent }]}>
            <LText
              style={[
                styles.stamp,
                {
                  color: meta.accent,
                  fontSize: stampSize(stamp),
                  lineHeight: stampSize(stamp) + 4,
                },
              ]}
              numberOfLines={1}
            >
              {stamp}
            </LText>
          </View>
          <View style={[styles.holder, stack && styles.holderStack]}>
            <LText
              variant="label"
              style={[styles.holderLabel, { color: meta.accent }]}
            >
              Valid for
            </LText>
            <LText
              variant="caption"
              style={styles.holderValue}
              numberOfLines={2}
            >
              {holderLabel}
            </LText>
          </View>
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
  ticketRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  ticketStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 22,
    paddingVertical: 32,
    paddingLeft: 36,
    paddingRight: 28,
  },
  bodyCompact: {
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  brandRowCompact: {
    gap: 14,
  },
  logoWell: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  logoWellCompact: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  logoWellImg: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  logoImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  logoImgCompact: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  company: {
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.9,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  chipExclusive: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: "#C5D6F5",
  },
  chipText: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  chipTextExclusive: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },

  railVertical: {
    width: 0,
    alignSelf: "stretch",
    position: "relative",
    zIndex: 2,
  },
  railHorizontal: {
    height: 0,
    alignSelf: "stretch",
    position: "relative",
    zIndex: 2,
  },
  dash: {
    position: "absolute",
    borderColor: "rgba(197, 205, 216, 0.95)",
  },
  dashVertical: {
    top: NOTCH / 2,
    bottom: NOTCH / 2,
    left: -1,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
  dashHorizontal: {
    left: NOTCH / 2,
    right: NOTCH / 2,
    top: -1,
    borderTopWidth: 2,
    borderStyle: "dashed",
  },
  stub: {
    flexShrink: 0,
    gap: 14,
  },
  stubRow: {
    width: STUB_W,
    minWidth: STUB_W,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  stubStack: {
    width: "100%",
    minHeight: STUB_STACK_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  stampBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: {
    fontFamily: Skoun.type.bodyBold,
    letterSpacing: -0.4,
    textAlign: "center",
    ...(IS_WEB ? ({ whiteSpace: "nowrap" } as object) : null),
  },
  holder: {
    alignItems: "center",
    gap: 2,
    maxWidth: "100%",
  },
  holderStack: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  holderLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    opacity: 0.85,
  },
  holderValue: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
    textAlign: "center",
  },
});
