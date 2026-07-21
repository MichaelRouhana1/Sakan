import { router, useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { END_MATCH_COPY } from "@/constants/roommateLaunch";
import { Skoun } from "@/constants/theme";
import {
  useEndMatch,
  useRoommateMatch,
} from "@/features/roommate/useRoommate";
import {
  buildWhatsAppRoommateUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useRoommateMatch(id ?? "");
  const endMatch = useEndMatch();

  const data = match.data;
  const ended = Boolean(data?.endedAt);
  const phone = data?.listing?.whatsappPhone;
  const area = data?.listing?.area ?? "Beirut";

  return (
    <ListerScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LText variant="label" tone="brass">
          Match
        </LText>
        <LText variant="display">
          {ended ? "Match ended" : "You’re matched"}
        </LText>

        {ended ? (
          <LText variant="body" tone="muted" style={{ marginTop: 12 }}>
            {data?.endCopy ?? END_MATCH_COPY}
          </LText>
        ) : (
          <>
            <LText variant="body" tone="muted" style={{ marginTop: 12 }}>
              WhatsApp is unlocked for this listing in {area}. Say hello about
              sharing the place.
            </LText>
            {hasUsableWhatsAppPhone(phone) ? (
              <LButton
                label="Open WhatsApp"
                onPress={() => {
                  void Linking.openURL(
                    buildWhatsAppRoommateUrl({ phone: phone!, area }),
                  );
                }}
                style={{ marginTop: 16 }}
              />
            ) : (
              <LText variant="caption" tone="danger" style={{ marginTop: 12 }}>
                Holder phone unavailable — try again later.
              </LText>
            )}
            <LButton
              label="End match"
              variant="secondary"
              onPress={() => {
                void endMatch.mutateAsync({ matchId: id! }).then(() => {
                  void match.refetch();
                });
              }}
              style={{ marginTop: 12 }}
            />
            <LText variant="caption" tone="muted" style={{ marginTop: 8 }}>
              {END_MATCH_COPY}
            </LText>
          </>
        )}

        <LButton
          label="Back to Roommates"
          variant="ghost"
          onPress={() => router.replace("/(renter)/(tabs)/roommates")}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
