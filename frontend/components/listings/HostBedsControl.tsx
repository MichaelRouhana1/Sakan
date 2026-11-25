import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { StepperControl } from "@/components/listings/create/StepperControl";
import { Studently } from "@/constants/theme";
import {
  fetchInventory,
  inventoryError,
  inventoryKey,
  saveInventory,
  type UnitInventory,
} from "@/features/listings/hostInventory";
import { bedsAvailableToast } from "@/lib/bedsAvailability";
import { publishListingFeedback } from "@/features/saved/savedToast";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Pick<
    Listing,
    "id" | "unitType" | "bedsTotal" | "bedsAvailable" | "inventoryVersion" | "inventoryNeedsConfirmation"
  >;
  /** Compact host-card layout vs manage panel. */
  compact?: boolean;
  onEmpty?: () => void;
};

/**
 * Quick beds available stepper for shared-room listings.
 * Saves immediately via inventory PATCH — no re-edit, review, or renewal.
 */
export function HostBedsControl({ listing, compact = false, onEmpty }: Props) {
  const { styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  const client = useQueryClient();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const total = listing.bedsTotal ?? 0;
  const available = listing.bedsAvailable;
  if (
    listing.unitType !== "shared_bed" ||
    listing.inventoryNeedsConfirmation ||
    available == null ||
    total < 1
  ) {
    return null;
  }

  async function change(next: number) {
    if (saving.current || next === available) return;
    if (next < 0 || next > total) return;
    saving.current = true;
    setBusy(true);
    setHint(null);
    const previous = available;
    client.setQueryData<Listing[]>(["listings", "mine"], (current) =>
      current?.map((unit) =>
        unit.id === listing.id ? { ...unit, bedsAvailable: next } : unit,
      ),
    );
    try {
      const cached = client.getQueryData<UnitInventory>(inventoryKey(listing.id));
      const source = cached ?? (await fetchInventory(listing.id));
      const result = await saveInventory(source, { bedsAvailable: next });
      client.setQueryData(inventoryKey(listing.id), result);
      client.setQueryData<Listing[]>(["listings", "mine"], (current) =>
        current?.map((unit) =>
          unit.id === listing.id
            ? {
                ...unit,
                bedsAvailable: result.bedsAvailable,
                inventoryVersion: result.inventoryVersion,
                availability: result.availability,
              }
            : unit,
        ),
      );
      void client.invalidateQueries({ queryKey: ["listings"] });
      void client.invalidateQueries({ queryKey: ["host-inventory"] });
      void client.invalidateQueries({ queryKey: ["unit-auto-renew"] });
      publishListingFeedback(
        `beds:${listing.id}`,
        bedsAvailableToast(Number(result.bedsAvailable), total),
      );
      if (next === 0) {
        setHint("No beds left. You can mark this listing rented when you’re ready.");
        onEmpty?.();
      }
    } catch (error) {
      client.setQueryData<Listing[]>(["listings", "mine"], (current) =>
        current?.map((unit) =>
          unit.id === listing.id ? { ...unit, bedsAvailable: previous } : unit,
        ),
      );
      publishListingFeedback(`beds:${listing.id}`, inventoryError(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <View
      style={[s.wrap, compact && s.compact]}
      accessibilityState={{ busy }}
      testID={`host-beds-${listing.id}`}
    >
      <StepperControl
        label={`Beds available: ${available} of ${total}`}
        value={available}
        min={0}
        max={total}
        onChange={(n) => void change(n)}
      />
      {hint ? (
        <Text accessibilityLiveRegion="polite" style={s.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const base = StyleSheet.create({
  wrap: { gap: 4, alignSelf: "stretch" },
  compact: { marginTop: 4 },
  hint: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
  },
});
