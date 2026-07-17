/** Display Fresh USD whole-dollar rent. */
export function formatFreshUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")} Fresh USD`;
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
