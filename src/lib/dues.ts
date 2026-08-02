// Pure dues math, shared by the admin dues page and the parent My Family view.
//
// A player's dues are a set of named *fees* (line items like "Club Fee" or
// "Friendlies Tournament"), each accruing its own *payments*. Keeping the sum
// logic here — rather than inline in the pages — means the coach's original bug
// (a second fee overwriting the first) is impossible: fees only ever add, and
// each fee's balance is computed independently from the payments tagged to it.

export interface FeeLike {
  id: number;
  amount: number | string;
}

export interface PaymentLike {
  fee_id: number;
  amount: number | string;
}

const num = (v: number | string | null | undefined): number => Number(v) || 0;

export type DuesStatus = 'paid' | 'partial' | 'unpaid';

/** Total already paid toward a single fee (sum of its payments). */
export function feePaid(feeId: number, payments: PaymentLike[]): number {
  return payments.reduce((sum, p) => (p.fee_id === feeId ? sum + num(p.amount) : sum), 0);
}

/** Remaining balance on a single fee (owed − paid), floored at nothing. */
export function feeBalance(fee: FeeLike, payments: PaymentLike[]): number {
  return num(fee.amount) - feePaid(fee.id, payments);
}

/**
 * Roll a player's fees + payments into owed / paid / balance totals.
 *
 * `payments` may contain rows for other players' fees; only payments whose
 * `fee_id` matches one of the supplied fees are counted, so callers can pass a
 * shared payment list without pre-filtering.
 */
export function computePlayerDues(fees: FeeLike[], payments: PaymentLike[]): {
  owed: number;
  paid: number;
  balance: number;
} {
  const owed = fees.reduce((sum, f) => sum + num(f.amount), 0);
  const feeIds = new Set(fees.map((f) => f.id));
  const paid = payments.reduce(
    (sum, p) => (feeIds.has(p.fee_id) ? sum + num(p.amount) : sum),
    0,
  );
  return { owed, paid, balance: owed - paid };
}

/** Payment status for a given owed/paid pair, or null when nothing is owed. */
export function duesStatus(owed: number, paid: number): DuesStatus | null {
  if (owed <= 0) return null;
  if (paid >= owed) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}
