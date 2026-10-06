const APP_NAME = "Skoun";

export type WhatsAppInquiryAnswers = {
  moveInDate?: string;
  household?: string;
  rentAcceptance?: string;
};

export type ListingAvailabilityForContact = "available" | "pending" | "rented";

/**
 * Deep-link into WhatsApp. The prefill asks the renter for move-in,
 * who is moving in, and whether the listed rent works.
 * phone: digits with country code, no + (e.g. 961xxxxxxx)
 */
export function buildWhatsAppListingUrl(params: {
  phone: string;
  propertyType: string;
  area: string;
  monthlyRentUsd?: number | null;
  availability?: ListingAvailabilityForContact | null;
  answers?: WhatsAppInquiryAnswers;
  /** Plain billing lines from `formatWhatsAppInclusionLines`. */
  inclusionLines?: string | null;
}): string {
  const digits = params.phone.replace(/\D/g, "");
  const text = buildWhatsAppListingMessage(params);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppListingMessage(params: {
  propertyType: string;
  area: string;
  monthlyRentUsd?: number | null;
  availability?: ListingAvailabilityForContact | null;
  answers?: WhatsAppInquiryAnswers;
  /** Plain billing lines from `formatWhatsAppInclusionLines`. */
  inclusionLines?: string | null;
}): string {
  const type = params.propertyType.trim() || "place";
  const area = params.area.trim() || "this area";
  const rent = rentSuffix(params.monthlyRentUsd);
  const intro =
    params.availability === "pending"
      ? `hi — your ${type} in ${area} is under offer on ${APP_NAME.toLowerCase()}. still interested if it frees up${rent}.`
      : `hi — interested in your ${type} in ${area} on ${APP_NAME.toLowerCase()}${rent}.`;
  const inclusionBlock = params.inclusionLines?.trim() ?? "";
  return `${intro}${inclusionBlock ? `\n${inclusionBlock}` : ""}
move-in date:${answerSuffix(params.answers?.moveInDate)}
who's moving in (count / students or work):${answerSuffix(params.answers?.household)}
ok with listed rent + what's included?:${answerSuffix(params.answers?.rentAcceptance)}`;
}

export function listingAllowsWhatsApp(
  availability?: ListingAvailabilityForContact | null,
): boolean {
  return availability !== "rented";
}

function rentSuffix(rent?: number | null): string {
  if (rent == null || !Number.isFinite(rent)) return "";
  return ` ($${Math.round(rent).toLocaleString("en-US")}/mo)`;
}

export function hasUsableWhatsAppPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

function answerSuffix(answer?: string): string {
  const value = answer?.trim();
  return value ? ` ${value}` : "";
}
