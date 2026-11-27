import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
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

const SURFACE = {
  ground: "#FFFFFF",
  subtle: "#F7F6F3",
  pressed: "#F4F2EE",
  divider: "#ECEAE6",
  border: "#DEDAD3",
  ink: "#1A1A1A",
  muted: "#5E5A55",
  faint: "#8A847C",
  verifiedBg: "#EEF8F1",
  verifiedInk: "#166534",
  errorBg: "#FEF3F2",
  errorBorder: "#F5C2C0",
  skeleton: "#ECEAE6",
  skeletonSoft: "#F3F1ED",
} as const;

type Props = {
  enabled?: boolean;
  /** "modal" matches PersonalInfoModal edge-to-edge rows; "inline" fits mobile web ProfileWeb. */
  variant?: "modal" | "inline";
  /** Optional hook for in-modal native toast; defaults to global SwipeToast/NativeToast. */
  onLoggedOut?: (toastMessage: string) => void;
};

function hapticSelection() {
  if (Platform.OS !== "web") {
    void Haptics.selectionAsync().catch(() => {});
  }
}

function hapticSuccess() {
  if (Platform.OS !== "web") {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  }
}

export function DeviceHistoryMobileSection({
  enabled = true,
  variant = "modal",
  onLoggedOut,
}: Props) {
  const clerkEnabled = useClerkEnabled();

  if (!clerkEnabled) {
    return (
      <DeviceHistoryMobileView
        variant={variant}
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
        onLoggedOut={onLoggedOut}
      />
    );
  }

  return (
    <ClerkBackedMobileDeviceHistory
      enabled={enabled}
      variant={variant}
      onLoggedOut={onLoggedOut}
    />
  );
}

function ClerkBackedMobileDeviceHistory({
  enabled,
  variant,
  onLoggedOut,
}: Required<Pick<Props, "enabled" | "variant">> & Pick<Props, "onLoggedOut">) {
  const state = useClerkDeviceSessions(enabled);
  return (
    <DeviceHistoryMobileView
      variant={variant}
      state={state}
      onLoggedOut={onLoggedOut}
    />
  );
}

function DeviceHistoryMobileView({
  variant,
  state,
  onLoggedOut,
}: {
  variant: "modal" | "inline";
  state: DeviceSessionsState;
  onLoggedOut?: (toastMessage: string) => void;
}) {
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

  const handleConfirmLogout = async (item: DeviceSessionItem) => {
    const result = await revokeSession(item);
    if (result.ok) {
      setConfirmingId(null);
      hapticSuccess();
      const message = loggedOutToastTitle(result.title);
      if (onLoggedOut) {
        onLoggedOut(message);
      } else {
        publishListingFeedback(`device-logout-${item.id}`, message);
      }
    }
  };

  const isInline = variant === "inline";
  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <View
      style={[styles.wrap, isInline && styles.wrapInline]}
      testID="device-history-mobile"
    >
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeading} accessibilityRole="header">
          Device history
        </Text>
        {status === "ready" ? (
          <Text style={styles.countMeta}>
            {sessions.length} active
          </Text>
        ) : null}
      </View>

      <Text style={styles.sectionSub}>
        Devices currently signed in to your account.
      </Text>

      {actionError ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={Studently.color.danger}
          />
          <Text style={styles.errorBannerText}>{actionError}</Text>
          <Pressable
            onPress={clearActionError}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            style={styles.dismissBtn}
          >
            <Ionicons name="close" size={16} color={Studently.color.danger} />
          </Pressable>
        </View>
      ) : null}

      {status === "loading" ? (
        <View
          style={styles.sectionRuleTop}
          accessibilityLabel="Loading signed-in devices"
        >
          <SkeletonRow last={false} />
          <SkeletonRow last />
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.stateErrorCard} accessibilityRole="alert">
          <View style={styles.stateErrorCopy}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={Studently.color.danger}
              style={styles.stateIcon}
            />
            <View style={styles.stateTextBlock}>
              <Text style={styles.stateErrorTitle}>
                Couldn’t load devices
              </Text>
              <Text style={styles.stateErrorBody}>
                {errorMessage ||
                  "Check your connection and try again."}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              hapticSelection();
              void refresh();
            }}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Try again loading devices"
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={SURFACE.ink} />
            ) : (
              <Text style={styles.retryBtnText}>Try again</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {status === "empty" ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="laptop-outline"
            size={20}
            color={SURFACE.muted}
            style={styles.stateIcon}
          />
          <View style={styles.stateTextBlock}>
            <Text style={styles.emptyTitle}>No active devices</Text>
            <Text style={styles.emptyBody}>
              Devices signed in to your account will appear here.
            </Text>
          </View>
        </View>
      ) : null}

      {status === "ready" ? (
        <View style={styles.sectionRuleTop}>
          {sessions.map((item, idx) => {
            const isLast = idx === sessions.length - 1;
            const isConfirming = confirmingId === item.id;
            const isRevoking = revokingId === item.id;
            const anyRevoking = revokingId !== null;

            return (
              <View
                key={item.id}
                testID={`device-session-row-${item.id}`}
                style={[
                  styles.row,
                  !isLast && styles.rowBorderBottom,
                ]}
              >
                <View style={styles.rowMain}>
                  <View
                    style={[
                      styles.iconTile,
                      item.isCurrent && styles.iconTileCurrent,
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
                      size={20}
                      color={item.isCurrent ? SURFACE.verifiedInk : SURFACE.ink}
                    />
                  </View>

                  <View style={styles.rowCopy}>
                    <View style={styles.titleLine}>
                      <Text style={styles.deviceTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.isCurrent ? (
                        <View style={styles.currentPill}>
                          <View style={styles.currentDot} />
                          <Text style={styles.currentPillText}>
                            Current session
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.deviceMeta}>{item.metaLine}</Text>
                  </View>

                  {!item.isCurrent && !isConfirming ? (
                    <Pressable
                      onPress={() => {
                        hapticSelection();
                        clearActionError();
                        setConfirmingId(item.id);
                      }}
                      disabled={anyRevoking}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Log out of ${item.title}`}
                      style={({ pressed }) => [
                        styles.logoutTrigger,
                        pressed && styles.logoutTriggerPressed,
                        anyRevoking && styles.disabledControl,
                      ]}
                    >
                      <Text style={styles.logoutTriggerText}>Log out</Text>
                    </Pressable>
                  ) : null}
                </View>

                {!item.isCurrent && isConfirming ? (
                  <View
                    style={styles.confirmBox}
                    accessibilityRole="alert"
                    testID={`device-confirm-${item.id}`}
                  >
                    <Text style={styles.confirmCopy}>
                      Log out of {item.title}? That device will need to sign in
                      again.
                    </Text>
                    <View style={styles.confirmActions}>
                      <Pressable
                        onPress={() => {
                          hapticSelection();
                          setConfirmingId(null);
                        }}
                        disabled={isRevoking}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel log out"
                        style={({ pressed }) => [
                          styles.cancelBtn,
                          pressed && styles.cancelBtnPressed,
                          isRevoking && styles.disabledControl,
                        ]}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleConfirmLogout(item)}
                        disabled={isRevoking}
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm log out of ${item.title}`}
                        accessibilityState={{ busy: isRevoking }}
                        style={({ pressed }) => [
                          styles.confirmBtn,
                          pressed && !isRevoking && styles.confirmBtnPressed,
                          isRevoking && styles.confirmBtnBusy,
                        ]}
                      >
                        {isRevoking ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.confirmBtnText}>Log out</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          {otherCount === 0 ? (
            <Text style={styles.onlyDeviceNote}>
              No other devices are currently signed in.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SkeletonRow({ last }: { last: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorderBottom]}>
      <View style={styles.rowMain}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonCopy}>
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLineNarrow} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 32,
  },
  wrapInline: {
    marginTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  sectionHeading: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0.1,
    color: SURFACE.muted,
  },
  countMeta: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: SURFACE.faint,
    fontVariant: ["tabular-nums"],
  },
  sectionSub: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.faint,
    marginBottom: 12,
  },
  sectionRuleTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE.divider,
  },
  row: {
    paddingVertical: 16,
    gap: 12,
  },
  rowBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.divider,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE.subtle,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  iconTileCurrent: {
    backgroundColor: SURFACE.verifiedBg,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  deviceTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: SURFACE.ink,
    flexShrink: 1,
  },
  currentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Studently.radius.pill,
    backgroundColor: SURFACE.verifiedBg,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SURFACE.verifiedInk,
  },
  currentPillText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: SURFACE.verifiedInk,
  },
  deviceMeta: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.muted,
    fontVariant: ["tabular-nums"],
  },
  logoutTrigger: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: -6,
    marginRight: -8,
    flexShrink: 0,
  },
  logoutTriggerPressed: {
    opacity: 0.65,
  },
  logoutTriggerText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: SURFACE.ink,
    textDecorationLine: "underline",
  },
  disabledControl: {
    opacity: 0.45,
  },
  confirmBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: SURFACE.errorBg,
    borderWidth: 1,
    borderColor: SURFACE.errorBorder,
    gap: 12,
  },
  confirmCopy: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.ink,
  },
  confirmActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.ground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  cancelBtnPressed: {
    backgroundColor: SURFACE.pressed,
  },
  cancelBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: SURFACE.ink,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Studently.color.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  confirmBtnPressed: {
    opacity: 0.88,
  },
  confirmBtnBusy: {
    opacity: 0.72,
  },
  confirmBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: "#FFFFFF",
  },
  onlyDeviceNote: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: SURFACE.faint,
    paddingTop: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SURFACE.errorBg,
    borderWidth: 1,
    borderColor: SURFACE.errorBorder,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Studently.color.danger,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stateErrorCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: SURFACE.errorBg,
    borderWidth: 1,
    borderColor: SURFACE.errorBorder,
    gap: 12,
  },
  stateErrorCopy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stateIcon: {
    marginTop: 2,
  },
  stateTextBlock: {
    flex: 1,
    gap: 2,
  },
  stateErrorTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: SURFACE.ink,
  },
  stateErrorBody: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.muted,
  },
  retryBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.ground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  retryBtnPressed: {
    backgroundColor: SURFACE.pressed,
  },
  retryBtnText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: SURFACE.ink,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: SURFACE.subtle,
  },
  emptyTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: SURFACE.ink,
  },
  emptyBody: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: SURFACE.muted,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE.skeleton,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  skeletonLineWide: {
    width: "58%",
    height: 14,
    borderRadius: 6,
    backgroundColor: SURFACE.skeleton,
  },
  skeletonLineNarrow: {
    width: "76%",
    height: 12,
    borderRadius: 6,
    backgroundColor: SURFACE.skeletonSoft,
  },
});
