// Shared formatting helpers. One money formatter for the whole app so dues,
// expenses, and sponsorships stop disagreeing on precision ($400 vs $400.00).

/** USD currency, always two decimals. Pair with `tabular-nums` when in a column
 *  (or just use the <Money> component, which bundles both). */
export function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
