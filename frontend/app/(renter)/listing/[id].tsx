import { useLocalSearchParams } from "expo-router";
import { ListingDetailMobile } from "@/components/listings/detail/ListingDetailMobile";

export default function RenterListingDetailScreen({
  listingId,
  onClose,
}: {
  listingId?: string;
  onClose?: () => void;
} = {}) {
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const id = listingId ?? paramId;
  return <ListingDetailMobile listingId={id} onClose={onClose} />;
}
