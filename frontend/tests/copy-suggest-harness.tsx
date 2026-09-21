// Test-only entry: bundles the actual Copy step without changing app routes or auth.
import { createContext, useContext, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CreateStepCopy } from "../components/listings/create/CreateStepCopy";
import { INITIAL_DRAFT, type CreateListingDraft } from "../features/listings/create/draft";

const DraftContext = createContext<{
  draft: CreateListingDraft; patch: (patch: Partial<CreateListingDraft>) => void;
  fieldInvalid: () => boolean;
}>(null!);
const AuthContext = createContext({ session: { userId: "first-host", role: "renter" }, isSignedIn: true, isLoading: false });
export const useCreateListingDraft = () => useContext(DraftContext);
export const useAuthSession = () => useContext(AuthContext);

function Harness() {
  const [draft, setDraft] = useState<CreateListingDraft>({
    ...INITIAL_DRAFT, area: "Hamra", spaceType: "entire_place", propertyType: "apartment",
    bedrooms: 2, beds: 2, bathrooms: 1, maxOccupancy: 2, monthlyRentUsd: "720",
    furnishingType: "semi", electricity: "scheduled_cuts", water: "tank_delivery",
    wifiIncluded: true, contactName: "PRIVATE CONTACT", addressLine: "PRIVATE ADDRESS",
  });
  const [userId, setUserId] = useState("first-host");
  const [signedIn, setSignedIn] = useState(true);
  const [visible, setVisible] = useState(true);
  const auth = useMemo(() => ({ session: { userId, role: "renter" }, isSignedIn: signedIn, isLoading: false }), [userId, signedIn]);
  return <AuthContext.Provider value={auth}>
    <DraftContext.Provider value={{ draft, patch: (p) => setDraft((d) => ({ ...d, ...p })), fieldInvalid: () => false }}>
      <div id="controls">
        <button onClick={() => setDraft((d) => ({ ...d, area: "Verdun" }))}>Change area</button>
        <button onClick={() => setDraft((d) => ({ ...d, area: "Hamra" }))}>Restore area</button>
        <button onClick={() => setUserId("second-host")}>Switch user</button>
        <button onClick={() => setSignedIn(false)}>Sign out</button>
        <button onClick={() => setVisible((v) => !v)}>Toggle copy</button>
      </div>
      <main><h1>Title and story</h1>{visible ? <CreateStepCopy /> : null}</main>
      <output data-testid="draft-state">{JSON.stringify(draft)}</output>
    </DraftContext.Provider>
  </AuthContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
