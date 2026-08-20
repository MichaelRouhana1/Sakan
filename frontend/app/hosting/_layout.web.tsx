import { Slot } from "expo-router";
import { HostWebShell } from "@/components/web/HostWebShell";

export default function HostingWebLayout() {
  return (
    <HostWebShell>
      <Slot />
    </HostWebShell>
  );
}
