import { Slot } from "expo-router";
import { CampusShell } from "@/components/campus/CampusShell";

export default function CampusWebLayout() {
  return (
    <CampusShell>
      <Slot />
    </CampusShell>
  );
}
