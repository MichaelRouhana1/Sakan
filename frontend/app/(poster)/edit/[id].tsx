import { useLocalSearchParams } from "expo-router";
import { EditListingScreen } from "@/components/listings/edit/EditListingScreen";
import { EditListingProvider } from "@/features/listings/edit/EditListingProvider";

export default function PosterEditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = typeof id === "string" ? id : "";
  return (
    <EditListingProvider listingId={listingId}>
      <EditListingScreen listingId={listingId} />
    </EditListingProvider>
  );
}
