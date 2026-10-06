/** Billing lines for the USD rent. Wi-Fi’s off state stays “ask”, matching the listing today. */

const WIFI_INCLUDED = "Wi\u2011Fi included";
const WIFI_ASK = "Ask about Wi\u2011Fi";

export type RentInclusionInput = {
  generatorIncluded?: boolean | null;
  waterBillIncluded?: boolean | null;
  wifiIncluded?: boolean | null;
  cookingGasIncluded?: boolean | null;
  buildingFeesIncluded?: boolean | null;
  parkingIncludedInRent?: boolean | null;
  amenities?: readonly string[] | null;
};

export type RentInclusionLine = {
  key: "generator" | "water" | "wifi" | "cookingGas" | "buildingFees" | "parking";
  included: boolean;
  /** Listing detail line. */
  detail: string;
  /** WhatsApp plain line. */
  whatsapp: string;
};

function on(value: boolean | null | undefined): boolean {
  return value === true;
}

function billingLine(
  key: RentInclusionLine["key"],
  label: string,
  included: boolean,
  separate: "billed separately" | "extra",
): RentInclusionLine {
  const name = label.toLowerCase();
  return {
    key,
    included,
    detail: included ? `${label} included` : separate === "extra" ? `${label} extra` : `${label} billed separately`,
    whatsapp: included ? `${name}: included` : `${name}: ${separate}`,
  };
}

export function rentInclusionLines(
  input: RentInclusionInput | null | undefined,
): RentInclusionLine[] {
  const src = input ?? {};
  const lines: RentInclusionLine[] = [
    billingLine("generator", "Generator fee", on(src.generatorIncluded), "billed separately"),
    billingLine("water", "Water bill", on(src.waterBillIncluded), "billed separately"),
    {
      key: "wifi",
      included: on(src.wifiIncluded),
      detail: on(src.wifiIncluded) ? WIFI_INCLUDED : WIFI_ASK,
      whatsapp: on(src.wifiIncluded) ? "wifi: included" : "wifi: ask",
    },
    billingLine("cookingGas", "Cooking gas", on(src.cookingGasIncluded), "billed separately"),
    billingLine("buildingFees", "Building fees", on(src.buildingFeesIncluded), "billed separately"),
  ];
  if ((src.amenities ?? []).includes("parking")) {
    lines.push(
      billingLine("parking", "Parking", on(src.parkingIncludedInRent), "extra"),
    );
  }
  return lines;
}

export function formatWhatsAppInclusionLines(
  input: RentInclusionInput | null | undefined,
): string {
  return rentInclusionLines(input)
    .map((line) => line.whatsapp)
    .join("\n");
}
