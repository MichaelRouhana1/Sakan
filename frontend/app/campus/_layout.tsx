import { Slot } from "expo-router";

/** Native: file routes render through Slot (same as hosting). Web uses `_layout.web.tsx`. */
export default function CampusLayout() {
  return <Slot />;
}
