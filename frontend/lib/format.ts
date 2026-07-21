/** Display whole-dollar rent in USD. */
export function formatFreshUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
