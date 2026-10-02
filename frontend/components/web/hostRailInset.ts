import { useEffect, useState } from "react";

let inset = 0;
const listeners = new Set<(value: number) => void>();

/** Pixels the host rail and its toggle occupy, so overlays leave them clickable. */
export function setHostRailInset(value: number) {
  if (inset === value) return;
  inset = value;
  listeners.forEach((listener) => listener(value));
}

export function useHostRailInset(): number {
  const [value, setValue] = useState(inset);
  useEffect(() => {
    setValue(inset);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
