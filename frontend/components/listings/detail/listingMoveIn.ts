import { formatFreshUsd } from "@/lib/format";
import { formatAvailableFrom, labelLeaseTerm } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

export type MoveInRow = { label: string; value: string };

export function listingMoveInRows(listing: Listing): MoveInRow[] {
  const rows: MoveInRow[] = [];
  const deposit = listing.securityDepositUsd ?? listing.unitSpecs?.depositUsd ?? 0;
  if (deposit > 0) {
    rows.push({ label: "Deposit", value: formatFreshUsd(deposit) });
  }

  const months = listing.unitSpecs?.minContractMonths;
  if (months != null && months > 0) {
    rows.push({
      label: "Min stay",
      value: months === 1 ? "1 month" : `${months} months`,
    });
  } else if (listing.leaseTerm) {
    rows.push({ label: "Min stay", value: labelLeaseTerm(listing.leaseTerm) });
  }

  const available = formatAvailableFrom(listing.availableFrom);
  if (available) {
    rows.push({ label: "Available", value: available });
  }

  return rows;
}
