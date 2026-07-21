import type { ListingType } from "@/types/listing";

const APP_NAME = "Skoun";

/**
 * Deep-link into WhatsApp with PRD template message.
 * phone: digits with country code, no + (e.g. 961<<<<<<<)
 */
export function buildWhatsAppListingUrl(params: {
  phone: string;
  propertyType: ListingType | string;
  area: string;
}): string {
  const digits = params.phone.replace(/\D/g, "");
  const text = `Hi, I saw your listing for the ${params.propertyType} in ${params.area} on ${APP_NAME}. Is it still available?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppRoommateUrl(params: {
  phone: string;
  area: string;
}): string {
  const digits = params.phone.replace(/\D/g, "");
  const text = `Hi, we matched on ${APP_NAME} about sharing a place in ${params.area}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function hasUsableWhatsAppPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

