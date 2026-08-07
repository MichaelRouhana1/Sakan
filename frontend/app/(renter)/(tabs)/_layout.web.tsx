import { Slot } from "expo-router";
import { WebShell } from "@/components/web/WebShell";
import { WebShellChromeProvider } from "@/components/web/WebShellChrome";
import { useMigrateLocalSaved } from "@/features/saved/useSavedListings";

/** Web-only tab shell — top nav site chrome, no NativeTabs. */
export default function RenterTabsWebLayout() {
  useMigrateLocalSaved();
  return (
    <WebShellChromeProvider>
      <WebShell showNavSearch>
        <Slot />
      </WebShell>
    </WebShellChromeProvider>
  );
}
