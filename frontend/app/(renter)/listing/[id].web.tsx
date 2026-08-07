import { useLocalSearchParams } from "expo-router";
import { ListingDetailWeb } from "@/components/web/ListingDetailWeb";
import { WebShell } from "@/components/web/WebShell";

export default function RenterListingDetailWebScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <WebShell showFooter={false}>
      <ListingDetailWeb listingId={id ?? ""} />
    </WebShell>
  );
}
