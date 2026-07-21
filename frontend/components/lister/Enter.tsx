import type { ReactNode } from "react";

/** Pass-through wrapper — enter animations removed. */
export function Enter({
  children,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return <>{children}</>;
}
