import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function PromotionAction({ listingId, label = 'Promote listing' }: { listingId: string; label?: string }) {
  const router = useRouter();
  return <Pressable accessibilityRole="button" onPress={event => { event.stopPropagation(); router.push(`/hosting/listing/${listingId}/promote` as never); }} style={({ pressed }) => ({ minHeight: 44, padding: 12, opacity: pressed ? 0.65 : 1 })}><Text style={{ fontFamily: 'DMSans_600SemiBold', color: '#2F6FED' }}>{label}</Text></Pressable>;
}
