import { useCallback, useEffect, useRef, useState } from "react";
import { labelListingType } from "@/lib/listingLabels";
import { openWhatsAppUrl } from "@/lib/openWhatsAppUrl";
import { handoffWhatsApp } from "@/lib/whatsappHandoff";
import { formatWhatsAppInclusionLines } from "@/lib/rentInclusion";
import {
  buildWhatsAppListingMessage,
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
  listingAllowsWhatsApp,
  type WhatsAppInquiryAnswers,
} from "@/lib/whatsapp";
import { recordListingContactTap } from "@/features/listings/recordListingContactTap";
import type { Listing } from "@/types/listing";

export function useWhatsAppInquiry(listing?: Listing) {
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WhatsAppInquiryAnswers>({});
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const opening = useRef(false);
  const canContact = Boolean(
    listing && listingAllowsWhatsApp(listing.availability) &&
    hasUsableWhatsAppPhone(listing.whatsappNumber),
  );
  const visible = canContact && activeListingId !== null && activeListingId === listing?.id;

  const close = useCallback(() => {
    generation.current += 1;
    opening.current = false;
    setActiveListingId(null);
    setAnswers({});
    setError(null);
    setIsOpening(false);
  }, []);

  useEffect(() => {
    close();
  }, [listing?.id, canContact, close]);

  useEffect(() => () => { generation.current += 1; }, []);

  const open = () => {
    if (!listing || !canContact || visible) return;
    generation.current += 1;
    opening.current = false;
    setAnswers({});
    setError(null);
    setIsOpening(false);
    setActiveListingId(listing.id);
  };

  const params = {
    propertyType: listing ? labelListingType(listing.listingType) : "",
    area: listing?.area ?? "",
    monthlyRentUsd: listing?.monthlyRentUsd,
    availability: listing?.availability,
    answers,
    inclusionLines: listing
      ? formatWhatsAppInclusionLines({
          generatorIncluded: listing.generatorIncluded,
          waterBillIncluded: listing.waterBillIncluded,
          wifiIncluded: listing.wifiIncluded,
          cookingGasIncluded: listing.cookingGasIncluded,
          buildingFeesIncluded: listing.buildingFeesIncluded,
          parkingIncludedInRent: listing.parkingIncludedInRent,
          amenities: listing.amenities,
        })
      : undefined,
  };

  const submit = async (skip = false) => {
    if (!listing || !canContact || !visible) { close(); return; }
    if (opening.current) return;
    opening.current = true;
    setIsOpening(true);
    setError(null);
    const current = generation.current;
    const url = buildWhatsAppListingUrl({
      ...params,
      phone: listing.whatsappNumber!,
      answers: skip ? undefined : answers,
    });
    try {
      await handoffWhatsApp(url, listing.id, openWhatsAppUrl, recordListingContactTap);
      if (current === generation.current) close();
    } catch {
      if (current === generation.current) {
        opening.current = false;
        setIsOpening(false);
        setError("Couldn’t open WhatsApp. Allow pop-ups if prompted, then try again.");
      }
    }
  };

  return {
    open, close, visible, answers, isOpening, error, submit,
    underOffer: listing?.availability === "pending",
    message: buildWhatsAppListingMessage(params),
    setAnswer: (field: keyof WhatsAppInquiryAnswers, value: string) => {
      setAnswers((current) => ({ ...current, [field]: value }));
    },
  };
}

export type WhatsAppInquiryController = ReturnType<typeof useWhatsAppInquiry>;
