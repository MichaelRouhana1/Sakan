import { useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";
import { useSetListingAvailability } from "@/features/listings/useSetListingAvailability";
import type { ListingAvailability } from "@/types/listing";

const OPTIONS: { id: ListingAvailability; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "pending", label: "Under offer" },
  { id: "rented", label: "Rented" },
];

type Props = {
  listingId: string;
  availability?: ListingAvailability | null;
  /** Pills stay on detail screens. The host card uses one dropdown button. */
  variant?: "pills" | "dropdown";
  /** White pill for controls that sit on a photo. */
  surface?: "default" | "overlay";
};

/** Ask before changing offer state. Rented only changes availability. */
export function ListingAvailabilityControl({
  listingId,
  availability,
  variant = "pills",
  surface = "default",
}: Props) {
  const current = availability ?? "available";
  const update = useSetListingAvailability(listingId);
  const [pending, setPending] = useState<ListingAvailability | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<View>(null);
  const busy = update.isPending;
  const currentOption = OPTIONS.find((option) => option.id === current) ?? OPTIONS[0];

  function ask(next: ListingAvailability) {
    setMenu(null);
    if (next === current || busy) return;
    setError(null);
    setPending(next);
  }

  function openMenu() {
    if (busy) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenu({ x, y, width, height });
    });
  }

  function close() {
    if (busy) return;
    setPending(null);
    setError(null);
  }

  async function confirm() {
    if (pending == null) return;
    setError(null);
    try {
      await update.mutateAsync(pending);
      setPending(null);
    } catch {
      setError("Could not update this listing. Try again.");
    }
  }

  return (
    <>
      {variant === "dropdown" ? (
        <View ref={anchorRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Status, ${currentOption.label}`}
            accessibilityState={{ expanded: menu != null }}
            disabled={busy}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (menu) setMenu(null);
              else openMenu();
            }}
            style={[
              styles.statusBtn,
              surface === "overlay" && styles.statusBtnOverlay,
              surface !== "overlay" && current === "available" && styles.chipOn,
              surface !== "overlay" && current === "pending" && styles.chipPending,
              surface !== "overlay" && current === "rented" && styles.chipRented,
            ]}
          >
            <Text
              style={[
                styles.statusBtnText,
                surface === "overlay" && styles.statusBtnTextOverlay,
                surface !== "overlay" && current === "available" && styles.labelOn,
                surface !== "overlay" && current === "pending" && styles.labelPending,
                surface !== "overlay" && current === "rented" && styles.labelRented,
              ]}
            >
              {currentOption.label}
            </Text>
            <Text
              style={[
                styles.chevron,
                surface === "overlay" && styles.statusBtnTextOverlay,
                surface !== "overlay" && current === "available" && styles.labelOn,
                surface !== "overlay" && current === "pending" && styles.labelPending,
                surface !== "overlay" && current === "rented" && styles.labelRented,
              ]}
            >
              ▾
            </Text>
          </Pressable>
        </View>
      ) : null}
      {variant === "pills" ? (
      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const selected = current === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: busy }}
              accessibilityLabel={`Mark listing ${option.label}`}
              disabled={busy}
              onPress={(event) => {
                event?.stopPropagation?.();
                ask(option.id);
              }}
              style={[
                styles.chip,
                selected && styles.chipOn,
                option.id === "pending" && selected && styles.chipPending,
                option.id === "rented" && selected && styles.chipRented,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  selected && styles.labelOn,
                  option.id === "pending" && selected && styles.labelPending,
                  option.id === "rented" && selected && styles.labelRented,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      ) : null}
      <Modal
        visible={menu != null}
        transparent
        animationType="none"
        onRequestClose={() => setMenu(null)}
      >
        <View style={styles.menuRoot}>
          <Pressable
            accessibilityLabel="Close status menu"
            onPress={() => setMenu(null)}
            style={styles.menuScrim}
          />
          {menu ? (
            <View
              style={[
                styles.menu,
                {
                  top: menu.y + menu.height + 4,
                  left: menu.x + menu.width - Math.max(menu.width, 148),
                  minWidth: Math.max(menu.width, 148),
                },
              ]}
            >
              {OPTIONS.map((option) => {
                const selected = current === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => ask(option.id)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      selected && styles.menuItemOn,
                      pressed && styles.menuItemPressed,
                    ]}
                  >
                    <Text style={[styles.menuItemText, selected && styles.menuItemTextOn]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal>
      <Modal
        visible={pending != null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.scrim} onPress={close}>
          <Pressable
            style={styles.dialog}
            onPress={(event) => event?.stopPropagation?.()}
          >
            {pending != null ? (
              <ConfirmDialog
                pending={pending}
                busy={busy}
                error={error}
                onConfirm={() => void confirm()}
                onCancel={close}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ConfirmDialog({
  pending,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  pending: ListingAvailability;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const copy =
    pending === "available"
      ? {
          title: "Mark available?",
          body: "This listing shows in search again.",
          confirm: "Mark available",
        }
      : pending === "pending"
        ? {
            title: "Mark under offer?",
            body: "This listing stays in search with an Under offer badge.",
            confirm: "Mark under offer",
          }
        : {
            title: "Mark rented?",
            body: "This takes the listing off search. It stays on your dashboard, and the days left do not change. You can set it back to available or under offer later.",
            confirm: "Mark rented",
          };
  return (
    <View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onCancel}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onConfirm}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{busy ? "Saving…" : copy.confirm}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const web = Platform.OS === "web";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  chipOn: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primarySoft,
  },
  chipPending: {
    borderColor: "rgba(146, 64, 14, 0.35)",
    backgroundColor: "#FEF3C7",
  },
  chipRented: {
    borderColor: "#CBD5E1",
    backgroundColor: "#F1F5F9",
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  labelOn: {
    color: Skoun.color.primary,
  },
  labelPending: {
    color: "#92400E",
  },
  labelRented: {
    color: "#334155",
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 38, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    backgroundColor: Skoun.color.surface,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 0,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    color: Skoun.color.ink,
  },
  body: {
    marginTop: 8,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
  },
  error: {
    marginTop: 8,
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.danger,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  primary: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  primaryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#FFFFFF",
  },
  secondary: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  secondaryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
    paddingHorizontal: 10,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  statusBtnOverlay: {
    minHeight: 0,
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...(web ? { boxShadow: "0 1px 6px rgba(0, 0, 0, 0.08)" } : null),
  },
  statusBtnTextOverlay: {
    color: Skoun.color.ink,
  },
  statusBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 16,
    color: Skoun.color.ink,
  },
  chevron: {
    fontSize: 11,
    lineHeight: 14,
    color: Skoun.color.inkMuted,
  },
  menuRoot: {
    flex: 1,
  },
  menuScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: "absolute",
    zIndex: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
    paddingVertical: 4,
    ...(web
      ? { boxShadow: "0 12px 28px rgba(18,24,38,0.14)" }
      : null),
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  menuItemOn: {
    backgroundColor: Skoun.color.primarySoft,
  },
  menuItemPressed: {
    backgroundColor: "#F8FAFC",
  },
  menuItemText: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 18,
    color: Skoun.color.ink,
  },
  menuItemTextOn: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.primary,
  },
});
