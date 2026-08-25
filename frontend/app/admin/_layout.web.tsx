import { Slot } from "expo-router";
import { AdminNeuShell } from "@/components/admin-neu/AdminNeuShell";

export default function AdminWebLayout() {
  return (
    <AdminNeuShell>
      <Slot />
    </AdminNeuShell>
  );
}
