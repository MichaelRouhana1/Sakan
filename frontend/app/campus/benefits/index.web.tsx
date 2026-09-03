import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { StudentBenefitsPage } from "@/components/campus/StudentBenefitsPage";

export default function CampusBenefitsWeb() {
  useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  return <StudentBenefitsPage />;
}
