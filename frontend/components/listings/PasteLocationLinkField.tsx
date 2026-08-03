import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { isInLebanon, type LatLng } from "@/lib/locationWkt";
import {
  extractUrlFromPaste,
  resolveLocationLink,
} from "@/lib/parseLocationLink";

type Props = {
  onResolved: (coord: LatLng) => void;
  onError: (message: string | null) => void;
};

const AUTO_RESOLVE_MS = 350;

/**
 * Paste-first Maps / WhatsApp location link → coordinates (caller drops pin).
 * Resolves automatically on clipboard paste or when a link appears in the field.
 */
export function PasteLocationLinkField({ onResolved, onError }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedRef = useRef<string | null>(null);
  const resolveGen = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function resolve(raw: string) {
    const paste = raw.trim();
    if (!paste) return;

    const extracted = extractUrlFromPaste(paste);
    if (!extracted) {
      onError("Paste a Google Maps, Apple Maps, or WhatsApp location link.");
      return;
    }

    if (lastResolvedRef.current === extracted && !busy) {
      return;
    }

    const gen = ++resolveGen.current;
    setBusy(true);
    onError(null);
    try {
      const result = await resolveLocationLink(paste);
      if (gen !== resolveGen.current) return;
      if (!result.ok) {
        onError(result.message);
        return;
      }
      if (!isInLebanon(result.coord)) {
        onError(
          "That pin is outside Lebanon — paste a place inside the country.",
        );
        return;
      }
      lastResolvedRef.current = extracted;
      onResolved(result.coord);
      setText(result.resolvedUrl);
    } catch {
      if (gen !== resolveGen.current) return;
      onError("Couldn’t read that link. Try again or drop a pin on the map.");
    } finally {
      if (gen === resolveGen.current) setBusy(false);
    }
  }

  function scheduleResolve(raw: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const extracted = extractUrlFromPaste(raw);
    if (!extracted) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void resolve(raw);
    }, AUTO_RESOLVE_MS);
  }

  async function pasteFromClipboard() {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip.trim()) {
        onError("Clipboard is empty — copy a Maps link first.");
        return;
      }
      setText(clip.trim());
      onError(null);
      await resolve(clip);
    } catch {
      onError("Couldn’t read the clipboard.");
    }
  }

  return (
    <View style={styles.root}>
      <LText variant="label" tone="muted">
        Paste location link
      </LText>
      <LText variant="caption" tone="muted" style={styles.hint}>
        Paste a Google Maps, Apple Maps, or WhatsApp place link — the pin drops
        automatically. Then Confirm.
      </LText>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => {
            setText(t);
            onError(null);
            scheduleResolve(t);
          }}
          placeholder="https://maps.app.goo.gl/… or maps.apple.com/…"
          placeholderTextColor={Lister.color.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          editable={!busy}
          onSubmitEditing={() => void resolve(text)}
          accessibilityLabel="Paste location link"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paste from clipboard"
          onPress={() => void pasteFromClipboard()}
          disabled={busy}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Lister.color.primary} />
          ) : (
            <Ionicons
              name="clipboard-outline"
              size={20}
              color={Lister.color.primary}
            />
          )}
        </Pressable>
      </View>
      {busy ? (
        <LText variant="caption" tone="primary">
          Reading link…
        </LText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { marginTop: -2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
