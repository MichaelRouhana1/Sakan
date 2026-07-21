import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { useMe } from "@/features/auth/useMe";
import {
  useMyLookingCard,
  useNearbyRoommateCount,
  useRoommateInbox,
} from "@/features/roommate/useRoommate";
import { formatFreshUsd } from "@/lib/format";
import { ROOMMATE_LAUNCH_AREAS } from "@/constants/roommateLaunch";

export default function RoommatesHubScreen() {
  const me = useMe();
  const card = useMyLookingCard();
  const inbox = useRoommateInbox();
  const sampleArea = card.data?.areas[0] ?? ROOMMATE_LAUNCH_AREAS[0];
  const nearby = useNearbyRoommateCount(sampleArea);

  const pending = useMemo(
    () => (inbox.data ?? []).filter((i) => i.status === "pending"),
    [inbox.data],
  );

  if (me.isLoading || card.isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Skoun.color.primary} />
        </View>
      </ListerScreen>
    );
  }

  const needsGender = !me.data?.gender;
  const hasCard = Boolean(card.data);

  return (
    <ListerScreen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Enter>
          <LText variant="label" tone="brass">
            Housing match
          </LText>
          <LText variant="display" style={styles.title}>
            Roommates
          </LText>
          <LText variant="body" tone="muted">
            Share a place with someone looking in your areas — same gender
            only. Contact unlocks after you both accept.
          </LText>
          {nearby.data?.inLaunch && nearby.data.count > 0 ? (
            <LText variant="caption" tone="primary" style={{ marginTop: 10 }}>
              {nearby.data.count} people looking nearby in {sampleArea}
            </LText>
          ) : null}
        </Enter>

        <Pressable
          onPress={() => router.push("/(renter)/roommates/guidelines")}
          style={styles.guidelines}
        >
          <LText variant="caption" tone="primary">
            Community guidelines
          </LText>
        </Pressable>

        {needsGender ? (
          <View style={styles.panel}>
            <LText variant="title">One private detail</LText>
            <LText variant="body" tone="muted" style={styles.gap}>
              We use gender only to show you same-gender seekers and holders.
              It never appears on your Looking card.
            </LText>
            <LButton
              label="Continue setup"
              onPress={() => router.push("/(renter)/roommates/looking-card")}
            />
          </View>
        ) : !hasCard ? (
          <View style={styles.panel}>
            <LText variant="title">Create a Looking card</LText>
            <LText variant="body" tone="muted" style={styles.gap}>
              Free. Tell holders your areas, budget, and move-in timing.
              Photos stay private until you accept an invite.
            </LText>
            <LButton
              label="Start Looking card"
              onPress={() => router.push("/(renter)/roommates/looking-card")}
            />
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <LText variant="title">Your Looking card</LText>
              <LText variant="caption" tone="primary">
                {card.data!.status}
              </LText>
            </View>
            <LText variant="body" style={styles.gap}>
              {card.data!.areas.join(" · ")}
            </LText>
            <LText variant="body" tone="muted">
              Up to {formatFreshUsd(card.data!.budgetMaxUsd)} ·{" "}
              {labelMoveIn(card.data!.moveInTiming)}
            </LText>
            <LButton
              label="Edit card"
              variant="secondary"
              onPress={() => router.push("/(renter)/roommates/looking-card")}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        <View style={styles.panel}>
          <LText variant="title">Invites</LText>
          {inbox.isLoading ? (
            <ActivityIndicator color={Skoun.color.primary} />
          ) : pending.length === 0 ? (
            <LText variant="body" tone="muted" style={styles.gap}>
              When a holder invites you to share their place, it shows up here.
              Accept or decline — nothing else.
            </LText>
          ) : (
            pending.map((invite) => (
              <Pressable
                key={invite.id}
                onPress={() =>
                  router.push(`/(renter)/roommates/invite/${invite.id}`)
                }
                style={styles.inviteRow}
              >
                <LText variant="subtitle">
                  {invite.listing?.area ?? "Listing"} ·{" "}
                  {invite.listing
                    ? formatFreshUsd(invite.listing.monthlyRentUsd)
                    : ""}
                </LText>
                <LText variant="caption" tone="muted" numberOfLines={2}>
                  {invite.note}
                </LText>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ListerScreen>
  );
}

function labelMoveIn(v: string) {
  if (v === "asap") return "ASAP";
  if (v === "this_month") return "This month";
  return "Flexible";
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  title: { marginTop: 4, marginBottom: 8 },
  guidelines: { alignSelf: "flex-start", marginTop: -4 },
  panel: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Skoun.color.border,
    gap: 4,
  },
  gap: { marginTop: 8 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inviteRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Skoun.color.border,
    gap: 4,
  },
});
