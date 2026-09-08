import { useLocalSearchParams } from "expo-router";
import { ListingDetailRoute } from "@/components/listings/detail/ListingDetailRoute";

export default function PosterListingDetailWebScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListingDetailRoute listingId={id ?? ""} />;
}
