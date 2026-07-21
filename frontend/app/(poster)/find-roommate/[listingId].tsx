import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { ROOMMATE_INVITE_NOTE_MIN } from "@/constants/roommateLaunch";
import { Lister } from "@/constants/listerTheme";
import { useMe } from "@/features/auth/useMe";
import { useListing } from "@/features/listings/useListing";
import {
  useCreateInvite,
  useSeekers,
  useSetGender,
} from "@/features/roommate/useRoommate";
import { formatFreshUsd } from "@/lib/format";
import type { SeekerTeaser } from "@/types/roommate";

function lifestyleLine(s: SeekerTeaser) {
  const sleep =
    s.sleepSchedule === "early"
      ? "Early sleeper"
      : s.sleepSchedule === "late"
        ? "Night owl"
        : "Flexible sleep";
  const smoke =
    s.smoking === "no"
      ? "No smoking"
      : s.smoking === "outdoors"
        ? "Outdoor smoking"
        : "Smokes";
  const pets = s.pets === "yes" ? "Pets ok" : "No pets";
  return `${sleep} · ${smoke} · ${pets}`;
}

function moveInLabel(v: string) {
  if (v === "asap") return "ASAP";
  if (v === "this_month") return "This month";
  return "Flexible";
}

export default function FindRoommateScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const me = useMe();
  const listing = useListing(listingId ?? "");
  const seekers = useSeekers(listingId ?? "");
  const createInvite = useCreateInvite();
  const setGender = useSetGender();

  const [genderPick, setGenderPick] = useState<"male" | "female" | null>(null);
  const [composeId, setComposeId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (listing.isLoading || seekers.isLoading || me.isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Lister.color.primary} />
        </View>
      </ListerScreen>
    );
  }

  if (!listing.data || listing.data.status !== "active") {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <LText variant="title">Listing not available</LText>
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

  async function ensureGender() {
    if (me.data?.gender) return true;
    if (!genderPick) {
      setError("Set gender once for same-gender matching.");
      return false;
    }
    await setGender.mutateAsync(genderPick);
    await me.refetch();
    return true;
  }

  async function sendInvite() {
    setError(null);
    if (!(await ensureGender())) return;
    if (!composeId) return;
    if (note.trim().length < ROOMMATE_INVITE_NOTE_MIN) {
      setError(`Note must be at least ${ROOMMATE_INVITE_NOTE_MIN} characters.`);
      return;
    }
    try {
      await createInvite.mutateAsync({
        listingId: listingId!,
        lookingCardId: composeId,
        note: note.trim(),
      });
      setComposeId(null);
      setNote("");
      void seekers.refetch();
    } catch {
      setError("Could not send invite. Check quota and try again.");
    }
  }

  return (
    <ListerScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Enter>
          <LText variant="label" tone="brass">
            Find roommate
          </LText>
          <LText variant="display">{listing.data.area}</LText>
          <LText variant="body" tone="muted" style={{ marginTop: 8 }}>
            Same-gender seekers overlapping this area. Teasers show lifestyle
            only — no phone or photos until they accept.
          </LText>
        </Enter>

        {!me.data?.gender ? (
          <View style={styles.panel}>
            <LText variant="subtitle">Your gender (private)</LText>
            <View style={styles.row}>
              {(["male", "female"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGenderPick(g)}
                  style={[
                    styles.chip,
                    genderPick === g && styles.chipOn,
                  ]}
                >
                  <LText
                    variant="caption"
                    style={{
                      color:
                        genderPick === g
                          ? Lister.color.surface
                          : Lister.color.ink,
                    }}
                  >
                    {g === "male" ? "Male" : "Female"}
                  </LText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {(seekers.data ?? []).length === 0 ? (
          <LText variant="body" tone="muted">
            No seekers looking in this area right now. Check back soon.
          </LText>
        ) : (
          (seekers.data ?? []).map((s) => (
            <View key={s.id} style={styles.panel}>
              <LText variant="subtitle">{s.areas.join(" · ")}</LText>
              <LText variant="body" tone="muted">
                Up to {formatFreshUsd(s.budgetMaxUsd)} · {moveInLabel(s.moveInTiming)}
              </LText>
              <LText variant="caption" tone="faint" style={{ marginTop: 6 }}>
                {lifestyleLine(s)}
              </LText>
              {composeId === s.id ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <LText variant="caption" tone="muted">
                    Required note (min {ROOMMATE_INVITE_NOTE_MIN} chars)
                  </LText>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    multiline
                    style={styles.note}
                    placeholder="Introduce the place and why they’d fit…"
                    placeholderTextColor={Lister.color.inkFaint}
                  />
                  <LButton
                    label="Send invite"
                    onPress={() => void sendInvite()}
                    loading={createInvite.isPending}
                  />
                  <LButton
                    label="Cancel"
                    variant="ghost"
                    onPress={() => {
                      setComposeId(null);
                      setNote("");
                    }}
                  />
                </View>
              ) : (
                <LButton
                  label="Invite"
                  variant="secondary"
                  onPress={() => setComposeId(s.id)}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          ))
        )}

        {error ? (
          <LText variant="caption" tone="danger">
            {error}
          </LText>
        ) : null}

        <LButton
          label="Back to listing"
          variant="ghost"
          onPress={() => router.back()}
        />
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  panel: {
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Lister.color.border,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.primaryMist,
  },
  chipOn: { backgroundColor: Lister.color.primaryDeep },
  note: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    padding: 12,
    textAlignVertical: "top",
    fontFamily: Lister.type.body,
    color: Lister.color.ink,
  },
});
