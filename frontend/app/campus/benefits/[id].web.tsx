import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { BenefitDetailPage } from "@/components/campus/BenefitDetailPage";

export default function CampusBenefitDetailWeb() {
  useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <BenefitDetailPage id={Array.isArray(id) ? (id[0] ?? "") : (id ?? "")} />
  );
}
