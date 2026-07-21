import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  useAcceptInvite,
  useDeclineInvite,
  useRoommateInbox,
} from "@/features/roommate/useRoommate";
import { formatFreshUsd } from "@/lib/format";

export default function InviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inbox = useRoommateInbox();
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();

  const invite = useMemo(
    () => (inbox.data ?? []).find((i) => i.id === id),
    [inbox.data, id],
  );

  if (inbox.isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Skoun.color.primary} />
        </View>
      </ListerScreen>
    );
  }

  if (!invite) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <LText variant="title">Invite not found</LText>
          <LButton
            label="Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
        </View>
      </ListerScreen>
    );
  }

  async function onAccept() {
    const result = await accept.mutateAsync(invite!.id);
    router.replace(`/(renter)/roommates/match/${result.match.id}`);
  }

  async function onDecline() {
    await decline.mutateAsync(invite!.id);
    router.back();
  }

  return (
    <ListerScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LText variant="label" tone="brass">
          Invite
        </LText>
        <LText variant="display">
          {invite.listing?.area ?? "Shared place"}
        </LText>
        {invite.listing ? (
          <LText variant="body" tone="muted" style={{ marginTop: 8 }}>
            {formatFreshUsd(invite.listing.monthlyRentUsd)}
            {invite.listing.landmark
              ? ` · near ${invite.listing.landmark}`
              : ""}
          </LText>
        ) : null}

        <View style={styles.note}>
          <LText variant="caption" tone="faint">
            Message from the holder
          </LText>
          <LText variant="body" style={{ marginTop: 8 }}>
            {invite.note}
          </LText>
        </View>

        <LText variant="caption" tone="muted">
          Accept to unlock WhatsApp. Decline stays private.
        </LText>

        {invite.status === "pending" ? (
          <View style={styles.actions}>
            <LButton
              label="Accept"
              onPress={() => void onAccept()}
              disabled={accept.isPending || decline.isPending}
            />
            <LButton
              label="Decline"
              variant="secondary"
              onPress={() => void onDecline()}
              disabled={accept.isPending || decline.isPending}
            />
          </View>
        ) : (
          <LText variant="body" tone="muted">
            Status: {invite.status}
          </LText>
        )}
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  note: {
    marginTop: 12,
    padding: 16,
    borderRadius: Skoun.radius.lg,
    backgroundColor: Skoun.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Skoun.color.border,
  },
  actions: { gap: 10, marginTop: 16 },
});
