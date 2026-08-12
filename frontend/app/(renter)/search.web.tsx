import { FindBrowse } from "@/components/web/FindBrowse";
import { WebShell } from "@/components/web/WebShell";
import { WebShellChromeProvider } from "@/components/web/WebShellChrome";

/** Web browse URL: `/search` (groups `(renter)/(tabs)` are omitted from the path). */
export default function SearchWebScreen() {
  return (
    <WebShellChromeProvider>
      <WebShell showNavSearch>
        <FindBrowse />
      </WebShell>
    </WebShellChromeProvider>
  );
}
