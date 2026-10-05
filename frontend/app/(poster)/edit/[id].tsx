import { useLocalSearchParams } from "expo-router";
import { EditListingScreen } from "@/components/listings/edit/EditListingScreen";
import { EditListingProvider } from "@/features/listings/edit/EditListingProvider";
import { hostEditSection } from "@/constants/hostRoutes";

export default function PosterEditListingScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const listingId = typeof id === "string" ? id : "";
  const initialSection = hostEditSection(typeof section === "string" ? section : null);
  return (
    <EditListingProvider listingId={listingId}>
      <EditListingScreen listingId={listingId} initialSection={initialSection} />
    </EditListingProvider>
  );
}
