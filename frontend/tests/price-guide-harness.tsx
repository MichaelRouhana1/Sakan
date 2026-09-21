// Browser-test entry only; never imported by an app route.
import { createContext, useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateStepPricing } from "../components/listings/create/CreateStepPricing";
import { INITIAL_DRAFT, type CreateListingDraft } from "../features/listings/create/draft";

const DraftContext = createContext<{
  draft: CreateListingDraft;
  patch: (patch: Partial<CreateListingDraft>) => void;
  fieldInvalid: () => boolean;
}>(null!);
const AuthContext = createContext({
  session: { userId: "first-time-host", role: "renter" }, isSignedIn: true, isLoading: false,
});
export const useCreateListingDraft = () => useContext(DraftContext);
export const useAuthSession = () => useContext(AuthContext);

const queryClient = new QueryClient();
function Harness() {
  const [draft, setDraft] = useState<CreateListingDraft>({
    ...INITIAL_DRAFT, area: "Hamra", spaceType: "entire_place",
    propertyType: "apartment", bedrooms: 1, monthlyRentUsd: "720",
  });
  const [signedIn, setSignedIn] = useState(true);
  const [userId, setUserId] = useState("first-time-host");
  const [visible, setVisible] = useState(true);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ session: { userId, role: "renter" }, isSignedIn: signedIn, isLoading: false }}>
        <DraftContext.Provider value={{ draft, patch: (patch) => setDraft((d) => ({ ...d, ...patch })), fieldInvalid: () => false }}>
          <div id="controls">
            <button onClick={() => setDraft((d) => ({ ...d, area: "Verdun" }))}>Change area</button>
            <button onClick={() => setDraft((d) => ({ ...d, bedrooms: 3 }))}>Change bedrooms</button>
            <button onClick={() => setDraft((d) => ({ ...d, spaceType: "shared_room", priceBasis: "per_bed_month" }))}>Change space and basis</button>
            <button onClick={() => setDraft((d) => ({ ...d, propertyType: "studio" }))}>Change property</button>
            <button onClick={() => setDraft((d) => ({ ...d, area: null }))}>Clear area</button>
            <button onClick={() => setSignedIn(false)}>Sign out</button>
            <button onClick={() => setUserId("another-host")}>Switch user</button>
            <button onClick={() => void queryClient.invalidateQueries()}>Refresh</button>
            <button onClick={() => setVisible((v) => !v)}>Toggle pricing</button>
          </div>
          <main>{visible ? <CreateStepPricing /> : null}</main>
          <output data-testid="draft-state">{JSON.stringify(draft)}</output>
        </DraftContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
