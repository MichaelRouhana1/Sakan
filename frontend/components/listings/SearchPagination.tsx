import { Pressable, Text, View } from 'react-native';
import { Skoun } from '@/constants/theme';

export function SearchPagination({ page, total, pageSize, hasNext, loading, onPage }: {
  page: number; total: number; pageSize: number; hasNext: boolean; loading?: boolean; onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous results page" disabled={page <= 1 || loading} onPress={() => onPage(page - 1)} style={{ padding: 12, opacity: page <= 1 || loading ? 0.4 : 1 }}>
      <Text style={{ color: Skoun.color.primary }}>Previous</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite">{page} / {Math.max(1, Math.ceil(total / pageSize))}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Next results page" disabled={!hasNext || loading} onPress={() => onPage(page + 1)} style={{ padding: 12, opacity: !hasNext || loading ? 0.4 : 1 }}>
      <Text style={{ color: Skoun.color.primary }}>Next</Text>
    </Pressable>
  </View>;
}
