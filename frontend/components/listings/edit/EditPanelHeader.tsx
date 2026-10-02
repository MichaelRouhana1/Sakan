import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

const GRACE =
  "You can still correct the floor, beds, or pin. After that, those fields lock to this unit.";

type Tone = "idle" | "saved" | "error" | "disclaimer";

type ArchiveProps = {
  confirmArchive: boolean;
  archivePending: boolean;
  onRequestArchive: () => void;
  onArchive: () => void;
};

type Props = ArchiveProps & {
  /** Floor, beds, and pin can still change. */
  structuralOpen: boolean;
  tone: Tone;
  message: string;
  pending: boolean;
  onClose: () => void;
  onSave: () => void;
};

type Slip = {
  accent: string;
  lead: string | null;
  body: string;
  foot: string | null;
};

function slipFor(tone: Tone, structuralOpen: boolean, message: string): Slip {
  if (tone === "error") {
    return { accent: Lister.color.danger, lead: "Not saved. ", body: message, foot: null };
  }
  if (tone === "disclaimer") {
    return { accent: Lister.color.warning, lead: "Confirm utilities. ", body: message, foot: null };
  }
  if (tone === "saved") {
    return {
      accent: Lister.color.primary,
      lead: "Saved. ",
      body: "No post credit used.",
      foot: null,
    };
  }
  if (structuralOpen) {
    return {
      accent: Lister.color.primary,
      lead: "First day after publish. ",
      body: GRACE,
      foot: "Doesn't use a post credit.",
    };
  }
  return {
    accent: Lister.color.inkFaint,
    lead: null,
    body: message,
    foot: null,
  };
}

export function EditPanelHeader({
  structuralOpen,
  tone,
  message,
  pending,
  confirmArchive,
  archivePending,
  onRequestArchive,
  onArchive,
  onClose,
  onSave,
}: Props) {
  const reduced = useReducedMotion();
  const slip = slipFor(tone, structuralOpen, message);
  const saveLabel = tone === "disclaimer" ? "Confirm" : "Save";

  return (
    <View accessibilityRole="header" style={styles.bar}>
      <CloseButton onPress={onClose} />
      <SlipNote slip={slip} />
      {structuralOpen ? null : (
        <UnitLockedChip
          confirmArchive={confirmArchive}
          archivePending={archivePending}
          onRequestArchive={onRequestArchive}
          onArchive={onArchive}
        />
      )}
      <SaveButton
        label={saveLabel}
        pending={pending}
        reduced={reduced}
        accessibilityLabel={tone === "disclaimer" ? "Confirm and save listing" : "Save changes"}
        onPress={onSave}
      />
    </View>
  );
}

export function UnitLockedChip({
  confirmArchive,
  archivePending,
  onRequestArchive,
  onArchive,
}: ArchiveProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<View>(null);
  const open = hovered || pinned || confirmArchive;

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  }

  function hideUnlessInside(event?: { relatedTarget?: EventTarget | null }) {
    const next = event?.relatedTarget;
    const node = anchorRef.current as unknown as HTMLElement | null;
    if (node && next instanceof Node && node.contains(next)) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(false), 80);
  }

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  return (
    <View
      ref={anchorRef}
      style={styles.lockAnchor}
      {...(Platform.OS === "web"
        ? {
            onMouseEnter: show,
            onMouseLeave: (event: { nativeEvent?: { relatedTarget?: EventTarget | null } }) =>
              hideUnlessInside(event.nativeEvent),
          }
        : null)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Unit locked"
        accessibilityHint="Rent, photos, utilities, and house rules can still change. The address, size, and who the place is for stay as first published."
        accessibilityState={{ expanded: open }}
        onHoverIn={show}
        onHoverOut={hideUnlessInside}
        onPress={(event) => {
          const pointerType = (event.nativeEvent as { pointerType?: string }).pointerType;
          if (Platform.OS !== "web" || pointerType === "touch") {
            setPinned((value) => !value);
          }
        }}
        style={({ hovered: chipHover, pressed }) => [
          styles.lockChip,
          (chipHover || open) && styles.lockChipOn,
          pressed && styles.lockChipPressed,
        ]}
      >
        <Ionicons name="lock-closed" size={12} color={Lister.color.warning} />
        <LText style={styles.lockChipLabel}>Unit locked</LText>
      </Pressable>
      {open ? (
        <View style={styles.lockPop}>
          <View style={styles.lockCard}>
            <LText variant="caption" tone="muted">
              Rent, photos, utilities, and house rules can still change. The address, size, and who the place is for stay as first published.
            </LText>
            {confirmArchive ? (
              <View style={styles.archiveRow}>
                <LText variant="caption">
                  Archive takes this listing off search. The next unit spends a post credit.
                </LText>
                <LButton
                  label="Archive and post again"
                  variant="secondary"
                  loading={archivePending}
                  onPress={onArchive}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={onRequestArchive}
                style={styles.linkBtn}
              >
                <LText variant="caption" tone="primary" style={styles.link}>
                  Need a different unit? Archive this listing and post again.
                </LText>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function EditPanelDismiss({ onClose }: { onClose: () => void }) {
  return (
    <View accessibilityRole="header" style={styles.bar}>
      <CloseButton onPress={onClose} />
    </View>
  );
}

function SlipNote({ slip }: { slip: Slip }) {
  const label = `${slip.lead ?? ""}${slip.body}${slip.foot ? `. ${slip.foot}` : ""}`;
  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel={label} style={styles.slip}>
      <View style={[styles.spine, { backgroundColor: slip.accent }]} />
      <View style={styles.copy}>
        <LText numberOfLines={2} style={styles.body}>
          {slip.lead ? (
            <LText style={[styles.lead, { color: slip.accent }]}>{slip.lead}</LText>
          ) : null}
          {slip.body}
        </LText>
        {slip.foot ? (
          <LText numberOfLines={1} style={styles.foot}>
            {slip.foot}
          </LText>
        ) : null}
      </View>
    </View>
  );
}

function SaveButton({
  label,
  pending,
  reduced,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  pending: boolean;
  reduced: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={onPress}
      style={({ pressed, hovered, focused }) => [
        styles.save,
        !reduced && styles.saveMotion,
        hovered && !pending && styles.saveHover,
        focused && styles.saveFocus,
        pressed && !pending && styles.savePressed,
        pending && styles.saveBusy,
      ]}
    >
      <View style={styles.saveIcon}>
        {pending ? (
          <ActivityIndicator color={Lister.color.surface} size="small" />
        ) : (
          <Ionicons name="save-outline" size={15} color={Lister.color.surface} />
        )}
      </View>
      <LText variant="caption" style={styles.saveLabel}>
        {label}
      </LText>
    </Pressable>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close edit"
      onPress={onPress}
      style={({ pressed, hovered, focused }) => [
        styles.close,
        !reduced && styles.closeMotion,
        hovered && styles.closeHover,
        focused && styles.closeFocus,
        pressed && styles.closePressed,
      ]}
    >
      <Ionicons name="close" size={16} color={Lister.color.ink} />
    </Pressable>
  );
}

const webFocus =
  Platform.OS === "web"
    ? {
        outlineWidth: 2,
        outlineStyle: "solid" as const,
        outlineColor: Lister.color.primary,
        outlineOffset: 2,
      }
    : null;

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Lister.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Lister.color.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 8,
    overflow: "visible",
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
    flexShrink: 0,
    cursor: "pointer",
  },
  closeMotion:
    Platform.OS === "web"
      ? {
          transitionProperty: "background-color",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease",
        }
      : {},
  closeHover: {
    backgroundColor: Lister.color.primaryMist,
  },
  closeFocus: webFocus ?? {},
  closePressed: {
    opacity: 0.72,
  },
  slip: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  spine: {
    width: 2,
    borderRadius: 1,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 1,
  },
  body: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.ink,
  },
  lead: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
  },
  foot: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: Lister.color.inkMuted,
  },
  save: {
    height: 36,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.primaryDeep,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    flexShrink: 0,
  },
  saveIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  saveMotion:
    Platform.OS === "web"
      ? {
          transitionProperty: "background-color",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease",
        }
      : {},
  saveHover: {
    backgroundColor: Lister.color.primary,
  },
  saveFocus: webFocus ?? {},
  savePressed: {
    opacity: 0.9,
  },
  saveBusy: {
    opacity: 0.7,
  },
  saveLabel: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 16,
  },
  lockAnchor: {
    position: "relative",
    flexShrink: 0,
    zIndex: 2,
  },
  lockChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.warningSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
  },
  lockChipOn: {
    backgroundColor: "#FDE68A",
  },
  lockChipPressed: {
    opacity: 0.82,
  },
  lockChipLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.warning,
  },
  lockPop: {
    position: "absolute",
    top: "100%",
    right: 0,
    width: 280,
    paddingTop: 8,
    zIndex: 30,
  },
  lockCard: {
    padding: 12,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.warningSoft,
    gap: 8,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 12px 28px rgba(18, 24, 38, 0.16)" }
      : { elevation: 8 }),
  },
  archiveRow: { gap: 8 },
  linkBtn: { alignSelf: "flex-start", cursor: "pointer" },
  link: { textDecorationLine: "underline" },
});
