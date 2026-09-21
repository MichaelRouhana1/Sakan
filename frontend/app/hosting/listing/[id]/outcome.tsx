import { useLocalSearchParams } from "expo-router";
import { HostExpiryDecisionPage } from "@/components/web/host/HostExpiryDecisionPage";

export default function HostListingOutcomeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HostExpiryDecisionPage listingId={id ?? ""} />;
}
