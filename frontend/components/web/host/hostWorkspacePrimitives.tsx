import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDesktopDesign } from '@/components/ui/DesktopDesign';
import { Studently } from '@/constants/theme';

export type Anchor = { x: number; y: number };

export function Button({ label, onPress, primary = false, disabled = false, icon, accessibilityLabel, minWidth }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; accessibilityLabel?: string; minWidth?: number }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [s.button, minWidth ? { minWidth: designSize(minWidth) } : null, primary && s.primaryButton, pressed && { opacity: .8 }, disabled && { opacity: .45 }]}>{icon ? <Ionicons name={icon} size={designSize(16)} color={primary ? '#FFFFFF' : '#52525B'} /> : null}<Text style={[s.buttonText, primary && s.primaryButtonText]}>{label}</Text></Pressable>;
}

export function IconButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}><Ionicons name={icon} size={designSize(20)} color="#5E5A55" /></Pressable>;
}

export function MenuTrigger({ label, onPress, onPhoto = false }: { label: string; onPress: (anchor: Anchor) => void; onPhoto?: boolean }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  const ref = useRef<View>(null);
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} onPress={() => ref.current?.measureInWindow((x, y, w, h) => onPress({ x: x + w, y: y + h }))} style={onPhoto ? s.photoMenu : s.iconButton}><Ionicons name="ellipsis-horizontal" size={designSize(20)} color={onPhoto ? Studently.color.ink : '#5E5A55'} /></Pressable>;
}

const base = StyleSheet.create({
  button: { minHeight: 44, borderWidth: 1, borderColor: '#D9DDE3', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF' },
  buttonText: { fontFamily: Studently.type.bodySemi, fontSize: 14, color: '#37332F' },
  primaryButton: { backgroundColor: '#EA3F4A', borderColor: '#EA3F4A' },
  primaryButtonText: { color: '#FFFFFF' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  photoMenu: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', boxShadow: '0 1px 4px rgba(26,26,26,0.22)' },
});
