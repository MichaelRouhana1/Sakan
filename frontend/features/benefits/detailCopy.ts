import type { Ionicons } from "@expo/vector-icons";
import type { BenefitRedemptionType, StudentBenefit } from "./types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Sentence boundary: terminator (+ optional closing quote/paren), whitespace,
 * then a capital / quote / paren / digit. Lookahead only — Hermes-safe.
 * "$2.99/month" and "music.apple.com" never split because there's no space.
 */
const SENTENCE_BREAK = /([.!?])(["”)]?)\s+(?=[A-Z“"(\d])/g;

export function splitSentences(text: string): string[] {
  return text
    .replace(SENTENCE_BREAK, "$1$2\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Restrictions, exclusions and conditions that a student would otherwise skim
 * past inside a paragraph. Deliberately excludes "only" — it's usually a price
 * brag ("only $5"), not a caveat.
 */
const FINE_PRINT =
  /\b(not|cannot|can't|isn't|aren't|won't|doesn't|don't|excluded?|excluding|except|unless|no longer|non-\w+|must re-?verify|re-?verif\w*|expires?|expiry|valid (?:until|through|on|for)|while (?:enrolled|verified|active)|per (?:person|student|account))\b/i;

export type DescriptionSplit = {
  /** The offer itself — rendered as prose. */
  lead: string[];
  /** Caveats pulled out into a "Good to know" list. Empty when nothing qualifies. */
  notes: string[];
};

/**
 * Re-chunks the description so caveats become a scannable list. Nothing is
 * dropped; the first sentence always stays in the lead because it carries the
 * offer itself (even when it mentions re-verification).
 */
export function splitFinePrint(description: string): DescriptionSplit {
  const sentences = splitSentences(description);
  if (sentences.length < 2) return { lead: sentences, notes: [] };

  const lead: string[] = [sentences[0] as string];
  const notes: string[] = [];
  for (const sentence of sentences.slice(1)) {
    if (FINE_PRINT.test(sentence)) notes.push(sentence);
    else lead.push(sentence);
  }
  return { lead, notes };
}

/** What to have on hand before redeeming — inferred from the offer's own text. */
export function readyItems(benefit: StudentBenefit): string[] {
  const hay = `${benefit.eligibility} ${benefit.description}`;
  const items: string[] = [];

  if (/student (?:id|card)|university (?:id|card)|campus card|carte|isic/i.test(hay)) {
    items.push("Student ID");
  }
  if (/student email|academic email|school email|university email|\.edu/i.test(hay)) {
    items.push("Student email");
  }
  if (/sheerid|unidays/i.test(hay)) {
    items.push("SheerID / UNiDAYS check");
  }
  if (benefit.redemptionType === "promo_code" && /\bapp\b/i.test(hay)) {
    items.push("Partner app");
  }
  if (items.length === 0) items.push("Proof of enrolment");
  return items.slice(0, 3);
}

export type RedemptionMeta = {
  /** Short noun for fact strips: "Partner link". */
  label: string;
  icon: IconName;
  cta: string;
  /** One-sentence explanation of what happens when the student acts. */
  how: (companyName: string) => string;
};

export const REDEMPTION_META: Record<BenefitRedemptionType, RedemptionMeta> = {
  link: {
    label: "Partner link",
    icon: "open-outline",
    cta: "Open the student offer",
    how: (company) =>
      `Opens ${company}'s student page. You verify there with your student email or ID.`,
  },
  promo_code: {
    label: "Promo code",
    icon: "pricetag-outline",
    cta: "Reveal my code",
    how: () => "You get a code to enter when you order or check out.",
  },
  show_id: {
    label: "Student ID in person",
    icon: "id-card-outline",
    cta: "Show me how to redeem",
    how: () =>
      "Redeemed on the spot — bring your student ID and follow the steps.",
  },
};

export type StepPath = {
  /** Optional lead-in kept as text, e.g. "In the app,". */
  prefix: string | null;
  steps: string[];
  /** Trailing text after the last step, e.g. "or start at music.apple.com/student." */
  suffix: string | null;
};

const MAX_STEP_CHARS = 30;
const TRAIL_SPLIT = /,\s+(?:or|then|and)\s+|\.\s+/;

/**
 * "Open Apple Music → Home → Student → Verify Eligibility, or start at …"
 * becomes a chip path plus trailing text. Returns null when the sentence
 * doesn't read cleanly as a path so the caller falls back to plain prose.
 */
export function parseStepPath(sentence: string): StepPath | null {
  if (!sentence.includes("→")) return null;
  const raw = sentence.split("→").map((s) => s.trim());
  if (raw.length < 2 || raw.length > 6) return null;

  let prefix: string | null = null;
  let suffix: string | null = null;
  const steps = [...raw];

  const first = steps[0] as string;
  if (first.length > MAX_STEP_CHARS) {
    const cut = first.lastIndexOf(", ");
    if (cut === -1) return null;
    prefix = first.slice(0, cut + 1).trim();
    steps[0] = first.slice(cut + 2).trim();
  }

  const last = steps[steps.length - 1] as string;
  const trail = TRAIL_SPLIT.exec(last);
  if (trail && trail.index > 0) {
    steps[steps.length - 1] = last.slice(0, trail.index).trim();
    suffix = last.slice(trail.index).replace(/^[,.]\s*/, "").trim() || null;
  } else {
    steps[steps.length - 1] = last.replace(/[.]+$/, "").trim();
  }

  if (steps.some((s) => s.length === 0 || s.length > MAX_STEP_CHARS)) {
    return null;
  }
  return { prefix, steps, suffix };
}

export function hostOf(url: string): string {
  const match = /^https?:\/\/([^/]+)/i.exec(url);
  return match?.[1]?.replace(/^www\./, "") ?? "source";
}
