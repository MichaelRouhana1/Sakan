import { useEffect, useState } from "react";
import { StudentlyAuthModal } from "@/components/auth/StudentlyAuthModal";

const listeners = new Set<(open: boolean) => void>();

/** Ask the single save-auth modal to open. Hearts call this when signed out. */
export function requestSaveAuth() {
  for (const listener of listeners) listener(true);
}

export function SaveAuthPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listeners.add(setOpen);
    return () => {
      listeners.delete(setOpen);
    };
  }, []);

  return (
    <StudentlyAuthModal
      visible={open}
      onClose={() => setOpen(false)}
      onSuccess={() => setOpen(false)}
      title="Sign in to save listings"
    />
  );
}
