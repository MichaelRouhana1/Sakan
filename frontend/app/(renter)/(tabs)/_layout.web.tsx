import { Slot, usePathname } from "expo-router";
import { WebShell } from "@/components/web/WebShell";
import { WebShellChromeProvider } from "@/components/web/WebShellChrome";
import { useMigrateLocalSaved } from "@/features/saved/useSavedListings";

/** Web-only tab shell — top nav site chrome, no NativeTabs. */
export default function RenterTabsWebLayout() {
  useMigrateLocalSaved();
  const pathname = usePathname();

  // SkounHomePage provides its own full-bleed header & site chrome.
  if (pathname === "/" || pathname === "") {
    return <Slot />;
  }

  return (
    <WebShellChromeProvider>
      <WebShell showNavSearch>
        <Slot />
      </WebShell>
    </WebShellChromeProvider>
  );
}
