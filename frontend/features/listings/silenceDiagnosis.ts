/** One next step for a live listing with no WhatsApp taps. */
export type SilenceAction =
  | "add_photos"
  | "review_price"
  | "boost"
  | "wait_peak"
  | "share"
  | "check_place";

export type SilenceInput = {
  live: boolean;
  viewCount: number;
  leadCount: number;
  photoCount: number;
  hasPin: boolean;
  rentUsd: number | null;
  /** 75th percentile of live comps. Null when there are not enough comps. */
  compHighUsd: number | null;
  /** False while the comp request is still running. */
  compsReady: boolean;
  boosted: boolean;
  /** A boost pack can be bought, or the host already has a boost credit. */
  boostSpendAvailable: boolean;
};

const ACTIONS = new Set<SilenceAction>([
  "add_photos",
  "review_price",
  "boost",
  "wait_peak",
  "share",
  "check_place",
]);

/**
 * First matching rule wins.
 * Views with zero taps: photos, then a high rent versus live area comps, then boost, then wait.
 * Zero views: share, or check the pin and photos. Never boost.
 * Any WhatsApp tap, or a listing that is not live, has no diagnosis.
 */
export function silenceDiagnosis(input: SilenceInput): SilenceAction | null {
  if (!input.live) return null;
  if (input.leadCount > 0) return null;

  if (input.viewCount <= 0) {
    if (input.photoCount < 3 || !input.hasPin) return "check_place";
    return "share";
  }

  if (input.photoCount < 3) return "add_photos";
  if (!input.compsReady) return null;
  if (
    input.compHighUsd != null &&
    input.rentUsd != null &&
    input.rentUsd > input.compHighUsd
  ) {
    return "review_price";
  }
  if (!input.boosted && input.boostSpendAvailable) return "boost";
  return "wait_peak";
}

export function silenceEditSection(
  action: SilenceAction,
  input: Pick<SilenceInput, "photoCount">,
): "photos" | "pricing" | "location" | null {
  if (action === "add_photos") return "photos";
  if (action === "review_price") return "pricing";
  if (action === "check_place") {
    return input.photoCount < 3 ? "photos" : "location";
  }
  return null;
}

export const SILENCE_COPY: Record<
  SilenceAction,
  { title: string; body: string; cta: string }
> = {
  add_photos: {
    title: "add better photos",
    body: "fewer than 3 photos. this opens the photo editor.",
    cta: "add photos",
  },
  review_price: {
    title: "review price",
    body: "rent is above most live listings in this area. this opens rent so you can change it.",
    cta: "review rent",
  },
  boost: {
    title: "try a short Bump",
    body: "a daily lift in normal results can give this listing more visibility. review photos and price too; placement cannot promise renters.",
    cta: "see Bump options",
  },
  wait_peak: {
    title: "wait for peak hours",
    body: "evenings and campus search windows are when students usually look. nothing else to change right now.",
    cta: "dismiss",
  },
  share: {
    title: "share listing",
    body: "no views yet. send the link to someone who might want it.",
    cta: "share listing",
  },
  check_place: {
    title: "check location/photos",
    body: "no views yet. check the pin and photos before spending a boost.",
    cta: "check listing",
  },
};

const STORAGE_KEY = "skoun.silenceTip";
const memory = new Map<string, SilenceAction>();

function readStored(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function dismissedSilenceAction(listingId: string): SilenceAction | null {
  const stored = readStored()[listingId] ?? memory.get(listingId) ?? null;
  if (stored && ACTIONS.has(stored as SilenceAction)) return stored as SilenceAction;
  return null;
}

export function dismissSilenceTip(listingId: string, action: SilenceAction): void {
  memory.set(listingId, action);
  if (typeof localStorage === "undefined") return;
  try {
    const next = { ...readStored(), [listingId]: action };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory dismiss still hides the tip for this session.
  }
}
