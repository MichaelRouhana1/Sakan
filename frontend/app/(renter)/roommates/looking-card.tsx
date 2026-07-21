import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
import {
  ROOMMATE_LAUNCH_AREAS,
  ROOMMATE_LAUNCH_AREA_SET,
} from "@/constants/roommateLaunch";
import { Skoun } from "@/constants/theme";
import { useMe } from "@/features/auth/useMe";
import {
  useMyLookingCard,
  useSetGender,
  useUpsertLookingCard,
} from "@/features/roommate/useRoommate";
import type {
  MoveInTiming,
  PetsPref,
  SleepSchedule,
  SmokingPref,
} from "@/types/roommate";
import { getSuggestedAreas } from "@/lib/roommateGrowth";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <LText
        variant="caption"
        style={{
          color: selected ? Skoun.color.surface : Skoun.color.ink,
          fontFamily: Skoun.type.bodySemi,
        }}
      >
        {label}
      </LText>
    </Pressable>
  );
}

export default function LookingCardScreen() {
  const me = useMe();
  const existing = useMyLookingCard();
  const setGender = useSetGender();
  const upsert = useUpsertLookingCard();

  const [gender, setGenderLocal] = useState<"male" | "female" | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [budget, setBudget] = useState("500");
  const [sleep, setSleep] = useState<SleepSchedule>("flexible");
  const [smoking, setSmoking] = useState<SmokingPref>("no");
  const [pets, setPets] = useState<PetsPref>("no");
  const [moveIn, setMoveIn] = useState<MoveInTiming>("flexible");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data?.gender) setGenderLocal(me.data.gender);
    if (me.data?.phone && !contact) setContact(me.data.phone);
  }, [me.data, contact]);

  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setAreas(c.areas.filter((a) => ROOMMATE_LAUNCH_AREA_SET.has(a)));
    setBudget(String(c.budgetMaxUsd));
    setSleep(c.sleepSchedule);
    setSmoking(c.smoking);
    setPets(c.pets);
    setMoveIn(c.moveInTiming);
    setContact(c.contactPhone);
  }, [existing.data]);

  useEffect(() => {
    if (existing.data) return;
    void getSuggestedAreas().then((suggested) => {
      if (suggested.length > 0) setAreas((prev) => (prev.length ? prev : suggested));
    });
  }, [existing.data]);

  const canSave = useMemo(() => {
    const budgetN = Number(budget);
    return (
      areas.length > 0 &&
      Number.isFinite(budgetN) &&
      budgetN > 0 &&
      contact.trim().length >= 8 &&
      (me.data?.gender || gender)
    );
  }, [areas, budget, contact, gender, me.data?.gender]);

  async function onSave() {
    setError(null);
    try {
      if (!me.data?.gender) {
        if (!gender) {
          setError("Pick your gender once — private, for matching only.");
          return;
        }
        await setGender.mutateAsync(gender);
      }
      await upsert.mutateAsync({
        areas,
        budgetMaxUsd: Number(budget),
        sleepSchedule: sleep,
        smoking,
        pets,
        moveInTiming: moveIn,
        contactPhone: contact.trim(),
        photoUrls: [],
        status: "active",
      });
      router.back();
    } catch {
      setError("Could not save. Check areas are in the launch set and try again.");
    }
  }

  function toggleArea(a: string) {
    setAreas((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  return (
    <ListerScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Enter>
          <LText variant="label" tone="brass">
            Looking card
          </LText>
          <LText variant="display">What you’re looking for</LText>
          <LText variant="body" tone="muted" style={{ marginTop: 8 }}>
            Holders see areas, budget, timing, and lifestyle chips — not your
            phone or photos until you accept.
          </LText>
        </Enter>

        {!me.data?.gender ? (
          <View style={styles.block}>
            <LText variant="subtitle">Gender (private)</LText>
            <LText variant="caption" tone="muted" style={{ marginBottom: 8 }}>
              Same-gender matching only. Never shown on your card.
            </LText>
            <View style={styles.row}>
              <Chip
                label="Male"
                selected={gender === "male"}
                onPress={() => setGenderLocal("male")}
              />
              <Chip
                label="Female"
                selected={gender === "female"}
                onPress={() => setGenderLocal("female")}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.block}>
          <LText variant="subtitle">Preferred areas</LText>
          <LText variant="caption" tone="muted" style={{ marginBottom: 8 }}>
            Soft-launch corridor
          </LText>
          <View style={styles.wrap}>
            {ROOMMATE_LAUNCH_AREAS.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={areas.includes(a)}
                onPress={() => toggleArea(a)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">Max budget (USD)</LText>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor={Skoun.color.inkFaint}
          />
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">Sleep</LText>
          <View style={styles.row}>
            {(
              [
                ["early", "Early"],
                ["flexible", "Flexible"],
                ["late", "Late"],
              ] as const
            ).map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={sleep === v}
                onPress={() => setSleep(v)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">Smoking</LText>
          <View style={styles.row}>
            {(
              [
                ["no", "No"],
                ["outdoors", "Outdoors"],
                ["yes", "Yes"],
              ] as const
            ).map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={smoking === v}
                onPress={() => setSmoking(v)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">Pets</LText>
          <View style={styles.row}>
            {(
              [
                ["no", "No pets"],
                ["yes", "Pets ok"],
              ] as const
            ).map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={pets === v}
                onPress={() => setPets(v)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">Move-in</LText>
          <View style={styles.row}>
            {(
              [
                ["asap", "ASAP"],
                ["this_month", "This month"],
                ["flexible", "Flexible"],
              ] as const
            ).map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={moveIn === v}
                onPress={() => setMoveIn(v)}
              />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <LText variant="subtitle">WhatsApp contact</LText>
          <LText variant="caption" tone="muted" style={{ marginBottom: 8 }}>
            Required. Shared only after both accept.
          </LText>
          <TextInput
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="961…"
            placeholderTextColor={Skoun.color.inkFaint}
          />
        </View>

        {error ? (
          <LText variant="caption" tone="danger">
            {error}
          </LText>
        ) : null}

        <LButton
          label="Save Looking card"
          onPress={() => void onSave()}
          disabled={!canSave || upsert.isPending || setGender.isPending}
        />
        <LButton
          label="Cancel"
          variant="ghost"
          onPress={() => router.back()}
        />
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  block: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Skoun.color.border,
  },
  chipOn: {
    backgroundColor: Skoun.color.primaryDeep,
    borderColor: Skoun.color.primaryDeep,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Skoun.type.body,
    fontSize: 16,
    color: Skoun.color.ink,
    backgroundColor: Skoun.color.surface,
  },
});
