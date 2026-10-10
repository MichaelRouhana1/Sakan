import { useLocalSearchParams } from 'expo-router';
import { HostPromotionPage } from '@/components/web/host/HostPromotionPage';

export default function PromotionRoute() {
  const { id, published, product } = useLocalSearchParams<{ id: string; published?: string; product?: string }>();
  return <HostPromotionPage listingId={id ?? ''} published={published === '1'} initialProduct={product} />;
}
