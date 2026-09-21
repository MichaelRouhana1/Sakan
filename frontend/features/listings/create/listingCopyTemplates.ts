/** Dependency-free copy engine. Mirrored in backend; parity is enforced by tests. */
export type CopyMode = "title" | "brief" | "description" | "all";
export type CopyFacts = {
  spaceType?: "entire_place" | "private_room" | "shared_room" | null;
  propertyType?: "apartment" | "studio" | "dormitory" | "house" | null;
  area?: string | null;
  primaryCampusId?: string | null;
  campusName?: string | null;
  landmark?: string | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  maxOccupancy?: number | null;
  furnishingType?: "furnished" | "semi" | "unfurnished" | null;
  electricity?: "solar" | "generator_24_7" | "scheduled_cuts" | null;
  electricityCutWindows?: { start: string; end: string }[];
  generatorAmperes?: number | null;
  hasSolar?: boolean;
  generatorIncluded?: boolean;
  water?: "state_well_24_7" | "tank_delivery" | null;
  wifiIncluded?: boolean;
  routerUps?: boolean;
  hasElevator?: boolean;
  elevator24_7?: boolean;
  conciergeIncluded?: boolean;
  cookingGasIncluded?: boolean;
  monthlyRentUsd?: number | null;
  securityDepositUsd?: number | null;
  priceBasis?: "per_unit_month" | "per_bed_month" | "per_room_month" | null;
  leaseTerm?: "semester" | "months_6" | "months_9" | "year" | "flexible" | null;
  paymentModality?: "monthly" | "semester" | "quarterly" | null;
  targetAudience?: "anyone" | "students_only" | "students_professionals" | null;
  genderRestriction?: "anyone" | "boys_only" | "girls_only" | null;
  amenities?: string[];
  highlightTags?: string[];
};
export type ListingCopy = { title: string; brief: string; description: string };
export type CopyResult = Partial<ListingCopy> & { source: "template" | "gemini" };
type Sentence = { id: string; variants: string[] };
export type CopyCatalogue = { titles: string[]; opening: Sentence[]; details: Sentence[] };

const amenities: Record<string, string> = {
  ac_all_rooms: "AC in all rooms", ac_salon: "AC in the salon only",
  washer: "washing machine", study_desk: "study desk and chair",
  fridge: "refrigerator", microwave: "microwave", balcony: "balcony / terrace",
  parking: "dedicated parking", water_heater_solar: "solar water heater",
  water_heater_electric: "electric water heater",
};
const leaseLabels = { semester: "a semester", months_6: "6 months", months_9: "9 months", year: "1 year", flexible: "a flexible term / sublet" };
const basisLabels = { per_unit_month: "per unit", per_bed_month: "per bed", per_room_month: "per room" };
const clean = (value: string | null | undefined) => value?.replace(/[\r\n\t]+/g, " ").trim() ?? "";
const amount = (value: number | null | undefined) => value != null && Number.isFinite(value) && value >= 0;
const dollars = (value: number) => `$${value.toLocaleString("en-US")}`;

export function buildCopyCatalogue(f: CopyFacts): CopyCatalogue {
  const area = clean(f.area);
  const campus = f.primaryCampusId ? clean(f.campusName) : "";
  const property = { apartment: "Apartment", studio: "Studio", dormitory: "Dorm / residence", house: "House / chalet" };
  const kind = f.spaceType === "private_room" ? "Private room" : f.spaceType === "shared_room" ? "Shared room" : f.propertyType ? property[f.propertyType] : "Housing listing";
  const bedCue = f.spaceType === "entire_place" && f.propertyType !== "studio" && f.bedrooms && f.bedrooms > 0 ? `${f.bedrooms}-bedroom ${kind.toLowerCase()}` : kind;
  const titleBase = area ? `${bedCue} in ${area}` : bedCue;
  const titles = [...new Set([
    campus ? `${titleBase} · Campus: ${campus}` : "", titleBase,
    area ? `${kind} in ${area}` : "", `${kind} for rent`, "Housing listing",
  ].filter((s) => s.length >= 10 && s.length <= 60))];
  const opening: Sentence[] = [{ id: "intro", variants: [
    `${kind}${area ? ` in ${area}` : ""}.`,
    `${kind} available${area ? ` in ${area}` : ""}.`,
  ] }];
  const details: Sentence[] = [];
  const add = (id: string, ...variants: string[]) => details.push({ id, variants });
  if (amount(f.monthlyRentUsd) && f.monthlyRentUsd! > 0 && f.priceBasis) {
    const rent = `${dollars(f.monthlyRentUsd!)} ${basisLabels[f.priceBasis]} per month`;
    opening.push({ id: "rent", variants: [`Rent is ${rent}.`, `Monthly rent: ${rent}.`] });
  } else {
    opening.push({ id: "confirm", variants: ["Contact the host to confirm any details not provided."] });
  }
  if (campus) add("campus", `Selected campus: ${campus}.`);
  if (clean(f.landmark)) add("landmark", `Landmark provided by the host: ${clean(f.landmark)}.`);
  const layout = [
    amount(f.bedrooms) ? `${f.bedrooms} bedroom${f.bedrooms === 1 ? "" : "s"}` : "",
    amount(f.beds) && f.beds! > 0 ? `${f.beds} bed${f.beds === 1 ? "" : "s"}` : "",
    amount(f.bathrooms) && f.bathrooms! > 0 ? `${f.bathrooms} bathroom${f.bathrooms === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  if (layout.length) add("layout", `Layout: ${layout.join(", ")}.`);
  if (amount(f.maxOccupancy) && f.maxOccupancy! > 0) add("occupancy", `Maximum occupancy: ${f.maxOccupancy} ${f.maxOccupancy === 1 ? "person" : "people"}.`);
  if (f.furnishingType) add("furnishing", `${{ furnished: "Fully furnished", semi: "Semi-furnished", unfurnished: "Unfurnished" }[f.furnishingType]}.`);
  if (f.electricity) {
    add("power", { solar: "Solar power is available.", generator_24_7: "24/7 generator power is available.", scheduled_cuts: "Electricity has scheduled cuts." }[f.electricity]);
    if (f.electricity === "scheduled_cuts") {
      const windows = (f.electricityCutWindows ?? []).filter((w) => /^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(w.end));
      if (windows.length) add("cuts", `Scheduled power cuts: ${windows.map((w) => `${w.start}–${w.end}`).join(", ")}.`);
    }
  }
  if (f.hasSolar && f.electricity !== "solar") add("solar", "Solar power is available.");
  if (f.electricity === "generator_24_7" || f.electricity === "scheduled_cuts") {
    if (amount(f.generatorAmperes) && f.generatorAmperes! > 0) add("amps", `Generator / ishtirak allowance: ${f.generatorAmperes} amps.`);
    if (f.generatorIncluded) add("generatorIncluded", "Generator costs are included in the rent.");
  }
  if (f.water) add("water", f.water === "state_well_24_7" ? "24/7 state / well water is available." : "Water is supplied by tank delivery.");
  if (f.wifiIncluded) add("wifi", "Wi-Fi is included in the rent.", "Rent includes Wi-Fi.");
  if (f.routerUps) add("ups", "A router UPS is available.");
  if (f.hasElevator) add("elevator", f.elevator24_7 ? "The elevator operates 24/7." : "An elevator is available.");
  if (f.conciergeIncluded) add("concierge", "Concierge costs are included in the rent.");
  if (f.cookingGasIncluded) add("gas", "Cooking gas is included in the rent.");
  const selected = [...new Set(f.amenities ?? [])].filter((slug) => Object.hasOwn(amenities, slug));
  // Conflicting AC scopes are omitted rather than asserting either one.
  const safeAmenities = selected.filter((s) => !((s === "ac_all_rooms" || s === "ac_salon") && selected.includes("ac_all_rooms") && selected.includes("ac_salon")));
  if (safeAmenities.length) add("amenities", `Amenities: ${safeAmenities.map((s) => amenities[s]).join(", ")}.`);
  const tags = new Set(f.highlightTags ?? []);
  if (tags.has("walk_to_campus") && campus) add("walk", `The host has marked this listing as walkable to ${campus}.`);
  // Power is described only by the structured electricity selection above.
  if (tags.has("fiber")) add("fiber", "Fiber internet is available.");
  if (tags.has("quiet_area")) add("quiet", "The host describes the area as quiet.");
  if (tags.has("newly_renovated")) add("renovated", "The property is newly renovated.");
  if (amount(f.securityDepositUsd)) add("deposit", f.securityDepositUsd === 0 ? "No security deposit is required." : `Security deposit: ${dollars(f.securityDepositUsd!)}.`);
  if (f.leaseTerm) add("lease", `Lease offered for ${leaseLabels[f.leaseTerm]}.`);
  if (f.paymentModality) add("payment", { monthly: "Rent is paid monthly.", semester: "Rent is paid per semester upfront.", quarterly: "Rent is paid quarterly." }[f.paymentModality]);
  if (f.targetAudience) add("audience", { anyone: "Open to all tenant groups.", students_only: "For students only.", students_professionals: "For students and professionals." }[f.targetAudience]);
  if (f.genderRestriction && f.genderRestriction !== "anyone") add("gender", f.genderRestriction === "boys_only" ? "For male tenants only." : "For female tenants only.");
  return { titles, opening, details };
}

export function generateListingCopy(facts: CopyFacts): ListingCopy {
  const c = buildCopyCatalogue(facts);
  const brief = c.opening.map((s) => s.variants[0]).join(" ");
  const paragraphs = [brief];
  for (let i = 0; i < c.details.length; i += 3) paragraphs.push(c.details.slice(i, i + 3).map((s) => s.variants[0]).join(" "));
  return { title: c.titles[0], brief, description: paragraphs.join("\n\n") };
}

export function selectCopy(copy: ListingCopy, mode: CopyMode, source: CopyResult["source"]): CopyResult {
  return mode === "all" ? { ...copy, source } : { [mode]: copy[mode], source };
}

/** Accept whole approved sentences, never just matching keywords or numbers. */
function parseSentences(text: string, allowed: Sentence[]): string[] | null {
  let rest = text.trim();
  const used: string[] = [];
  while (rest) {
    const matches = allowed.flatMap((s) => s.variants.map((v) => ({ id: s.id, text: v })))
      .filter((v) => rest.startsWith(v.text) && (rest.length === v.text.length || /\s/.test(rest[v.text.length])))
      .sort((a, b) => b.text.length - a.text.length);
    const match = matches[0];
    if (!match || used.includes(match.id)) return null;
    used.push(match.id);
    rest = rest.slice(match.text.length).trimStart();
  }
  return used;
}

export function validatePolishedCopy(value: unknown, facts: CopyFacts, mode: CopyMode): Partial<ListingCopy> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = mode === "all" ? ["title", "brief", "description"] as const : [mode];
  if (Object.keys(raw).some((k) => !keys.includes(k as typeof keys[number]))) return null;
  const c = buildCopyCatalogue(facts);
  const validBrief = (s: string) => {
    if (s.length > 700 || /[\r\n]/.test(s)) return false;
    const ids = parseSentences(s, c.opening);
    return ids?.length === c.opening.length && ids[0] === "intro";
  };
  for (const key of keys) {
    const s = raw[key];
    if (typeof s !== "string" || s !== s.trim()) return null;
    if (key === "title" && !c.titles.includes(s)) return null;
    if (key === "brief" && !validBrief(s)) return null;
    if (key === "description") {
      if (s.length < 20 || s.length > 4000) return null;
      const [brief, ...paragraphs] = s.split(/\n\s*\n/);
      if (!validBrief(brief)) return null;
      const ids = parseSentences(paragraphs.join(" "), c.details);
      if (!ids || ids.length !== c.details.length) return null;
      if (mode === "all" && brief !== raw.brief) return null;
    }
  }
  return raw as Partial<ListingCopy>;
}

export function replaceDescriptionBrief(description: string, brief: string): string {
  const boundary = /\r?\n[\t ]*\r?\n/.exec(description);
  return boundary ? brief + description.slice(boundary.index) : brief;
}
