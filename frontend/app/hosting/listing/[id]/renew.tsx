import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { RenewUnitConfirmation } from "@/components/web/host/UnitRenewalControls";
export default function RenewUnitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <View style={{ flex: 1, alignItems: 'center', padding: 28 }}><RenewUnitConfirmation listingId={id} onClose={() => router.replace('/hosting/listing' as never)} /></View>;
}
