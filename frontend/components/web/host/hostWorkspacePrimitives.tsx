import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDesktopDesign } from '@/components/ui/DesktopDesign';
import { Studently } from '@/constants/theme';

export type Anchor = { x: number; y: number; left?: number; top?: number; width?: number; height?: number };

/** `iconOnly` drops the visible label (it stays the accessible name); `tinted` marks a non-default state. */
export function Button({ label, onPress, primary = false, disabled = false, icon, accessibilityLabel, minWidth, iconOnly = false, tinted = false }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; accessibilityLabel?: string; minWidth?: number; iconOnly?: boolean; tinted?: boolean }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [s.button, minWidth ? { minWidth: designSize(minWidth) } : null, iconOnly && s.iconOnlyButton, primary && s.primaryButton, tinted && s.tintedButton, pressed && { opacity: .8 }, disabled && { opacity: .45 }, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)]}>{icon ? <Ionicons name={icon} size={designSize(iconOnly ? 20 : 16)} color={primary ? '#FFFFFF' : tinted ? '#A82D36' : '#52525B'} /> : null}{iconOnly ? null : <Text style={[s.buttonText, primary && s.primaryButtonText]}>{label}</Text>}</Pressable>;
}

export function IconButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[s.iconButton, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)]}><Ionicons name={icon} size={designSize(20)} color="#5E5A55" /></Pressable>;
}

export function MenuTrigger({ label, onPress, onPhoto = false }: { label: string; onPress: (anchor: Anchor) => void; onPhoto?: boolean }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  const ref = useRef<View>(null);
  function trigger() {
    if (Platform.OS === 'web') {
      const rect = (ref.current as unknown as HTMLElement | null)?.getBoundingClientRect?.();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        onPress({ x: rect.right, y: rect.bottom, left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        return;
      }
    }
    ref.current?.measureInWindow((x, y, w, h) => onPress({ x: x + w, y: y + h, left: x, top: y, width: w, height: h }));
  }
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} onPress={trigger} style={(state) => {
    const hovered = Boolean((state as { hovered?: boolean }).hovered);
    return [
      onPhoto ? s.photoMenu : s.iconButton,
      hovered && (onPhoto ? s.photoMenuHover : s.iconButtonHover),
      state.pressed && s.triggerPressed,
      Platform.OS === 'web' && ({ cursor: 'pointer', transitionProperty: 'background-color, box-shadow, transform', transitionDuration: '120ms' } as object),
    ];
  }}><Ionicons name="ellipsis-horizontal" size={designSize(20)} color={onPhoto ? Studently.color.ink : '#5E5A55'} /></Pressable>;
}

const base = StyleSheet.create({
  button: { minHeight: 44, borderWidth: 1, borderColor: '#D9DDE3', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF' },
  buttonText: { fontFamily: Studently.type.bodySemi, fontSize: 14, color: '#37332F' },
  primaryButton: { backgroundColor: '#EA3F4A', borderColor: '#EA3F4A' },
  primaryButtonText: { color: '#FFFFFF' },
  iconOnlyButton: { width: 44, paddingHorizontal: 0 },
  tintedButton: { backgroundColor: '#FDECEE', borderColor: '#F3B8BD' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  iconButtonHover: { backgroundColor: '#F3F4F6' },
  photoMenu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', boxShadow: '0 1px 4px rgba(26,26,26,0.22)' },
  photoMenuHover: { backgroundColor: '#FFFFFF', boxShadow: '0 3px 10px rgba(26,26,26,0.24)' },
  triggerPressed: { opacity: 0.82 },
});
