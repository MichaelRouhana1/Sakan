import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Studently } from "@/constants/theme";
import {
  loggedOutToastTitle,
  type DeviceSessionItem,
} from "@/features/auth/deviceSessions";
import {
  useClerkDeviceSessions,
  type DeviceSessionsState,
} from "@/features/auth/useDeviceSessions";
import { publishListingFeedback } from "@/features/saved/savedToast";
import { useClerkEnabled } from "@/lib/clerkEnabled";

type PressState = { pressed: boolean; hovered?: boolean };

const web = Platform.OS === "web";

const STATUS_TONE = {
  currentBg: "#EEF8F1",
  currentInk: "#166534",
  currentDot: "#166534",
  dangerTint: "#FEF3F2",
  dangerBorder: "#F5C2C0",
} as const;

type Props = {
  /** Compact tablet desktop (768–899px) stacks metadata neatly below title. */
  stacked?: boolean;
};

export function ProfileDeviceHistory({ stacked = false }: Props) {
  const clerkEnabled = useClerkEnabled();

  if (!clerkEnabled) {
    return (
      <ProfileDeviceHistoryView
        stacked={stacked}
        state={{
          status: "empty",
          sessions: [],
          errorMessage: null,
          actionError: null,
          revokingId: null,
          refreshing: false,
          refresh: async () => {},
          revokeSession: async () => ({
            ok: false,
            error: "Session management is unavailable right now.",
          }),
          clearActionError: () => {},
        }}
      />
    );
  }

  return <ClerkBackedDesktopDeviceHistory stacked={stacked} />;
}

function ClerkBackedDesktopDeviceHistory({ stacked }: { stacked: boolean }) {
  const state = useClerkDeviceSessions(true);
  return <ProfileDeviceHistoryView stacked={stacked} state={state} />;
}

function ProfileDeviceHistoryView({
  stacked,
  state,
}: {
  stacked: boolean;
  state: DeviceSessionsState;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const {
    status,
    sessions,
    errorMessage,
    actionError,
    revokingId,
    refreshing,
    refresh,
    revokeSession,
    clearActionError,
  } = state;

  useEffect(() => {
    if (confirmingId && !sessions.some((s) => s.id === confirmingId)) {
      setConfirmingId(null);
    }
  }, [confirmingId, sessions]);

  useEffect(() => {
    if (!confirmingId || !web) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !revokingId) {
        setConfirmingId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingId, revokingId]);

  const handleConfirmLogout = async (item: DeviceSessionItem) => {
    const result = await revokeSession(item);
    if (result.ok) {
      setConfirmingId(null);
      publishListingFeedback(
        `device-logout-${item.id}`,
        loggedOutToastTitle(result.title),
      );
    }
  };

  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <View style={styles.wrap} testID="device-history-desktop">
      <View style={styles.headerBar}>
        <View style={styles.headerCopy}>
          <LText variant="label" tone="muted" accessibilityRole="header">
            Device history
          </LText>
          <LText variant="caption" tone="muted" style={styles.subtitle}>
            Where your account is currently signed in. Log out any device you
            don’t recognize.
          </LText>
        </View>

        <View style={styles.headerControls}>
          {status === "ready" ? (
            <View style={styles.counterPill}>
              <View style={styles.counterDot} />
              <LText style={styles.counterText}>
                {sessions.length}{" "}
                {sessions.length === 1 ? "active device" : "active devices"}
              </LText>
            </View>
          ) : null}

          {status === "ready" || status === "error" ? (
            <Pressable
              onPress={() => void refresh()}
              disabled={refreshing || revokingId !== null}
              accessibilityRole="button"
              accessibilityLabel="Refresh device history"
              style={({ pressed, hovered }: PressState) => [
                styles.refreshBtn,
                (hovered || pressed) && styles.refreshBtnHover,
                (refreshing || revokingId !== null) && styles.disabled,
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={designSize(15)}
                color={Studently.color.inkMuted}
              />
              <LText style={styles.refreshBtnText}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </LText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {actionError ? (
        <View style={styles.actionAlert} accessibilityRole="alert">
          <Ionicons
            name="alert-circle-outline"
            size={designSize(17)}
            color={Studently.color.danger}
          />
          <LText variant="caption" style={styles.actionAlertText}>
            {actionError}
          </LText>
          <Pressable
            onPress={clearActionError}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            style={styles.alertClose}
          >
            <Ionicons
              name="close"
              size={designSize(15)}
              color={Studently.color.danger}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tableFrame}>
        {status === "ready" && !stacked ? (
          <View style={styles.colHead}>
            <LText style={[styles.colHeadText, styles.colDevice]}>Device</LText>
            <LText style={[styles.colHeadText, styles.colActivity]}>
              Location & last active
            </LText>
            <LText style={[styles.colHeadText, styles.colAction]}>
              Session
            </LText>
          </View>
        ) : null}

        {status === "loading" ? (
          <View accessibilityLabel="Loading signed-in devices">
            <DesktopSkeletonRow stacked={stacked} />
            <DesktopSkeletonRow stacked={stacked} last />
          </View>
        ) : null}

        {status === "error" ? (
          <View style={styles.stateRow} accessibilityRole="alert">
            <View style={styles.stateLeft}>
              <View style={styles.stateIconError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={designSize(20)}
                  color={Studently.color.danger}
                />
              </View>
              <View style={styles.stateCopy}>
                <LText variant="subtitle" style={styles.stateTitle}>
                  Couldn’t load your signed-in devices
                </LText>
                <LText variant="caption" tone="muted">
                  {errorMessage ||
                    "Check your connection and try again."}
                </LText>
              </View>
            </View>
            <Pressable
              onPress={() => void refresh()}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel="Try again loading device history"
              style={({ pressed, hovered }: PressState) => [
                styles.retryBtn,
                (hovered || pressed) && styles.retryBtnHover,
                refreshing && styles.disabled,
              ]}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={Studently.color.ink} />
              ) : (
                <LText style={styles.retryBtnText}>Try again</LText>
              )}
            </Pressable>
          </View>
        ) : null}

        {status === "empty" ? (
          <View style={styles.stateRow}>
            <View style={styles.stateLeft}>
              <View style={styles.stateIconNeutral}>
                <Ionicons
                  name="laptop-outline"
                  size={designSize(20)}
                  color={Studently.color.inkMuted}
                />
              </View>
              <View style={styles.stateCopy}>
                <LText variant="subtitle" style={styles.stateTitle}>
                  No active devices
                </LText>
                <LText variant="caption" tone="muted">
                  Devices signed in to your account will appear here.
                </LText>
              </View>
            </View>
          </View>
        ) : null}

        {status === "ready" ? (
          <>
            {sessions.map((item, idx) => {
              const isLast = idx === sessions.length - 1 && otherCount > 0;
              const isConfirming = confirmingId === item.id;
              const isRevoking = revokingId === item.id;
              const anyRevoking = revokingId !== null;

              return (
                <DesktopSessionRow
                  key={item.id}
                  item={item}
                  stacked={stacked}
                  last={isLast}
                  isConfirming={isConfirming}
                  isRevoking={isRevoking}
                  anyRevoking={anyRevoking}
                  onStartConfirm={() => {
                    clearActionError();
                    setConfirmingId(item.id);
                  }}
                  onCancelConfirm={() => setConfirmingId(null)}
                  onConfirmLogout={() => void handleConfirmLogout(item)}
                />
              );
            })}

            {otherCount === 0 ? (
              <View style={styles.reassuranceRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={designSize(16)}
                  color={Studently.color.inkMuted}
                />
                <LText variant="caption" tone="muted">
                  No other devices are signed in to your account right now.
                </LText>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

function DesktopSessionRow({
  item,
  stacked,
  last,
  isConfirming,
  isRevoking,
  anyRevoking,
  onStartConfirm,
  onCancelConfirm,
  onConfirmLogout,
}: {
  item: DeviceSessionItem;
  stacked: boolean;
  last: boolean;
  isConfirming: boolean;
  isRevoking: boolean;
  anyRevoking: boolean;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmLogout: () => void;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <View
      testID={`device-session-row-${item.id}`}
      {...(web
        ? ({
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          } as object)
        : {})}
      style={[
        styles.row,
        stacked && styles.rowStacked,
        item.isCurrent && styles.rowCurrent,
        !item.isCurrent && hovered && styles.rowHover,
        isConfirming && styles.rowConfirming,
        !last && styles.rowRuleBottom,
      ]}
    >
      {/* Column 1: Icon + OS · Browser + Current tag */}
      <View style={[styles.deviceCell, !stacked && styles.colDevice]}>
        <View
          style={[
            styles.iconBadge,
            item.isCurrent && styles.iconBadgeCurrent,
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name={
              item.kind === "phone"
                ? "phone-portrait-outline"
                : "laptop-outline"
            }
            size={designSize(19)}
            color={
              item.isCurrent ? STATUS_TONE.currentInk : Studently.color.ink
            }
          />
        </View>
        <View style={styles.deviceCopy}>
          <View style={styles.deviceTitleRow}>
            <LText style={styles.deviceTitle} numberOfLines={1}>
              {item.title}
            </LText>
            {item.isCurrent ? (
              <View style={styles.currentTag}>
                <View style={styles.currentTagDot} />
                <LText style={styles.currentTagText}>Current session</LText>
              </View>
            ) : null}
          </View>
          {stacked ? (
            <LText style={styles.metaText}>{item.metaLine}</LText>
          ) : null}
        </View>
      </View>

      {/* Column 2: Location · Date at time */}
      {!stacked ? (
        <View style={[styles.activityCell, styles.colActivity]}>
          <LText style={styles.metaText}>{item.metaLine}</LText>
        </View>
      ) : null}

      {/* Column 3: Status or Log out / Inline confirmation */}
      <View
        style={[
          styles.actionCell,
          !stacked && styles.colAction,
          stacked && styles.actionCellStacked,
        ]}
      >
        {item.isCurrent ? (
          <LText style={styles.activeHereText}>Active on this device</LText>
        ) : isConfirming ? (
          <View
            style={styles.inlineConfirm}
            accessibilityRole="alert"
            testID={`device-confirm-${item.id}`}
          >
            <LText style={styles.confirmPrompt}>Log out device?</LText>
            <View style={styles.confirmBtns}>
              <Pressable
                onPress={onCancelConfirm}
                disabled={isRevoking}
                accessibilityRole="button"
                accessibilityLabel="Cancel log out"
                style={({ pressed, hovered: btnHover }: PressState) => [
                  styles.cancelPill,
                  (btnHover || pressed) && styles.cancelPillHover,
                  isRevoking && styles.disabled,
                ]}
              >
                <LText style={styles.cancelPillText}>Cancel</LText>
              </Pressable>
              <Pressable
                onPress={onConfirmLogout}
                disabled={isRevoking}
                accessibilityRole="button"
                accessibilityLabel={`Confirm log out of ${item.title}`}
                accessibilityState={{ busy: isRevoking }}
                style={({ pressed, hovered: btnHover }: PressState) => [
                  styles.confirmDangerPill,
                  (btnHover || pressed) && !isRevoking && styles.confirmDangerPillHover,
                  isRevoking && styles.disabled,
                ]}
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <LText style={styles.confirmDangerText}>Log out</LText>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={onStartConfirm}
            disabled={anyRevoking}
            accessibilityRole="button"
            accessibilityLabel={`Log out of ${item.title}`}
            style={({ pressed, hovered: btnHover }: PressState) => [
              styles.logoutPill,
              (btnHover || pressed) && styles.logoutPillHover,
              anyRevoking && styles.disabled,
            ]}
          >
            {({ pressed, hovered: btnHover }: PressState) => (
              <LText
                style={[
                  styles.logoutPillText,
                  (btnHover || pressed) && styles.logoutPillTextHover,
                ]}
              >
                Log out
              </LText>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function DesktopSkeletonRow({
  stacked,
  last = false,
}: {
  stacked: boolean;
  last?: boolean;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  return (
    <View
      style={[
        styles.row,
        stacked && styles.rowStacked,
        !last && styles.rowRuleBottom,
      ]}
    >
      <View style={[styles.deviceCell, !stacked && styles.colDevice]}>
        <View style={styles.skelIcon} />
        <View style={styles.skelStack}>
          <View style={styles.skelTitle} />
          {stacked ? <View style={styles.skelMeta} /> : null}
        </View>
      </View>
      {!stacked ? (
        <View style={[styles.activityCell, styles.colActivity]}>
          <View style={styles.skelMeta} />
        </View>
      ) : null}
      <View style={[styles.actionCell, !stacked && styles.colAction]}>
        <View style={styles.skelBtn} />
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 14,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  headerCopy: {
    gap: 4,
    flexShrink: 1,
    minWidth: 220,
  },
  subtitle: {
    lineHeight: 20,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Studently.color.surfaceMuted,
  },
  counterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STATUS_TONE.currentDot,
  },
  counterText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Studently.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    cursor: "pointer",
  },
  refreshBtnHover: {
    backgroundColor: Studently.color.surfaceMuted,
  },
  refreshBtnText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.inkMuted,
  },
  actionAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: STATUS_TONE.dangerTint,
    borderWidth: 1,
    borderColor: STATUS_TONE.dangerBorder,
  },
  actionAlertText: {
    flex: 1,
    color: Studently.color.danger,
  },
  alertClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  tableFrame: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: Studently.color.border,
  },
  colHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Studently.color.border,
    gap: 20,
  },
  colHeadText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: Studently.color.inkFaint,
  },
  colDevice: {
    flex: 1.35,
    minWidth: 0,
  },
  colActivity: {
    flex: 1.25,
    minWidth: 0,
  },
  colAction: {
    width: 248,
    alignItems: "flex-end",
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 20,
    ...(web
      ? ({
          transitionProperty: "background-color",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease",
        } as object)
      : {}),
  },
  rowStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
    paddingHorizontal: 16,
  },
  rowCurrent: {
    backgroundColor: "rgba(238, 248, 241, 0.45)",
  },
  rowHover: {
    backgroundColor: "rgba(47, 111, 237, 0.04)",
  },
  rowConfirming: {
    backgroundColor: STATUS_TONE.dangerTint,
  },
  rowRuleBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Studently.color.border,
  },
  deviceCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Studently.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBadgeCurrent: {
    backgroundColor: STATUS_TONE.currentBg,
  },
  deviceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  deviceTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: Studently.color.primaryDeep,
  },
  currentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: STATUS_TONE.currentBg,
  },
  currentTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STATUS_TONE.currentDot,
  },
  currentTagText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    lineHeight: 15,
    color: STATUS_TONE.currentInk,
  },
  activityCell: {
    justifyContent: "center",
  },
  metaText: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Studently.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  actionCell: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionCellStacked: {
    alignItems: "flex-start",
    paddingLeft: 54,
  },
  activeHereText: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: STATUS_TONE.currentInk,
  },
  logoutPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    ...(web
      ? ({
          transitionProperty: "background-color, border-color",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease",
        } as object)
      : {}),
  },
  logoutPillHover: {
    borderColor: Studently.color.danger,
    backgroundColor: STATUS_TONE.dangerTint,
  },
  logoutPillText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.ink,
  },
  logoutPillTextHover: {
    color: Studently.color.danger,
  },
  inlineConfirm: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  confirmPrompt: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.ink,
  },
  confirmBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelPill: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  cancelPillHover: {
    backgroundColor: Studently.color.surfaceMuted,
  },
  cancelPillText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.ink,
  },
  confirmDangerPill: {
    height: 34,
    minWidth: 78,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Studently.color.danger,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  confirmDangerPillHover: {
    opacity: 0.9,
  },
  confirmDangerText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  reassuranceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  stateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 220,
  },
  stateIconError: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: STATUS_TONE.dangerTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stateIconNeutral: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Studently.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stateCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stateTitle: {
    fontSize: 15,
    lineHeight: 21,
    color: Studently.color.primaryDeep,
  },
  retryBtn: {
    height: 38,
    minWidth: 96,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Studently.color.ink,
    backgroundColor: Studently.color.surface,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  retryBtnHover: {
    backgroundColor: Studently.color.surfaceMuted,
  },
  retryBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Studently.color.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  skelIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Studently.color.surfaceMuted,
  },
  skelStack: {
    flex: 1,
    gap: 8,
  },
  skelTitle: {
    width: 156,
    height: 14,
    borderRadius: 6,
    backgroundColor: Studently.color.surfaceMuted,
  },
  skelMeta: {
    width: 192,
    height: 13,
    borderRadius: 6,
    backgroundColor: Studently.color.surfaceMuted,
  },
  skelBtn: {
    width: 82,
    height: 34,
    borderRadius: 999,
    backgroundColor: Studently.color.surfaceMuted,
  },
});
