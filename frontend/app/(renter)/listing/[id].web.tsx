import { useLocalSearchParams } from "expo-router";
import { ListingDetailRoute } from "@/components/listings/detail/ListingDetailRoute";

export default function RenterListingDetailWebScreen({
  listingId,
  onClose,
}: {
  listingId?: string;
  onClose?: () => void;
} = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resolvedId = listingId ?? id ?? "";
  return <ListingDetailRoute listingId={resolvedId} onClose={onClose} />;
}
