// Pure club-finance math, shared by the admin overview dashboard and the
// expenses page. Before this existed the sponsor-revenue rule was copy-pasted
// into three files with three different numeric coercions, and the dashboard
// quietly summed only sponsorships — so its "Balance" disagreed with the
// expenses page by the entire fundraising + dues total. One definition here
// means the two pages cannot drift apart again.
//
// Money reaches the team through three streams:
//   1. Sponsorships  — cash from businesses (in-kind services excluded, see below)
//   2. Fundraising   — the `income` table: water sales, concessions, donations
//   3. Dues          — the `dues_payments` table, but only *some* fee titles
//
// Dues need care. Season dues are collected from parents and handed to the
// parent club, so they never belong to this team's books — counting them would
// inflate the balance with money the team can't spend. Tournament fees are the
// opposite: parents pay them in and the team pays the tournament out (an expense
// under "Tournament Fees"), so the outflow is already booked and omitting the
// inflow makes every tournament read as a pure loss.
//
// Which titles are pass-through is a club policy decision, not something this
// module can infer from a fee's name, so it arrives as an explicit set of
// excluded titles (configured in admin Settings). See `duesByFeeTitle` for the
// per-line-item view that makes the split legible.

import { isDateInSeason, type Season } from './seasons';

/** Postgres `numeric` columns can arrive as strings; never trust the TS type. */
export const num = (v: number | string | null | undefined): number => Number(v) || 0;

export interface AmountRow {
  amount: number | string | null | undefined;
}

export function sumAmounts(rows: AmountRow[]): number {
  return rows.reduce((total, row) => total + num(row.amount), 0);
}

/**
 * Sum only the rows whose date falls inside `season`. Rows with no usable date
 * are skipped, so a season sum can be less than the all-time sum — that is the
 * intended behaviour (undated money can't be attributed to a season) and is why
 * the running balance below always uses all-time figures.
 */
export function sumInSeason<T>(
  rows: T[],
  dateOf: (row: T) => string | null | undefined,
  amountOf: (row: T) => number | string | null | undefined,
  season: Season,
): number {
  return rows.reduce((total, row) => {
    const date = dateOf(row);
    if (!date || !isDateInSeason(date, season)) return total;
    return total + num(amountOf(row));
  }, 0);
}

// ---------------------------------------------------------------- sponsorships

export interface SponsorshipLike {
  amount: number | string | null | undefined;
  status?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
}

/**
 * Whether a sponsorship represents actual cash in the club's account.
 *
 * Pending sponsorships haven't been agreed yet, and "Services/In-Kind" is real
 * value but never becomes spendable money — counting it would inflate the
 * balance against which the treasurer writes cheques.
 */
export function isCashSponsorship(s: SponsorshipLike): boolean {
  const status = s.status || 'pending';
  return (status === 'approved' || status === 'completed') && s.payment_method !== 'Services/In-Kind';
}

export function sponsorRevenue(sponsorships: SponsorshipLike[]): number {
  return sumAmounts(sponsorships.filter(isCashSponsorship));
}

export function sponsorRevenueInSeason(sponsorships: SponsorshipLike[], season: Season): number {
  return sumInSeason(sponsorships.filter(isCashSponsorship), (s) => s.created_at, (s) => s.amount, season);
}

// ---------------------------------------------------------------------- dues

export interface FeeLike {
  id: number;
  name: string;
  amount: number | string | null | undefined;
  season?: string | null;
  player_id?: number;
}

export interface PaymentLike {
  fee_id: number;
  amount: number | string | null | undefined;
  paid_on?: string | null;
  created_at?: string | null;
}

/** Cash date for a dues payment: when it was received, else when it was logged. */
export const paymentDate = (p: PaymentLike): string | null | undefined => p.paid_on || p.created_at;

/**
 * The fee titles collected on behalf of the parent club rather than kept by the
 * team. Default matches the title the dues migration generated; the admin
 * Settings page overrides it, since coaches name fees freely.
 */
export const DEFAULT_PASSTHROUGH_FEE_TITLES = ['Season Dues'];

/** Parse the Settings value (one title per line, or comma-separated). */
export function parsePassthroughFeeTitles(raw: string | null | undefined): Set<string> {
  if (raw == null || raw.trim() === '') return new Set(DEFAULT_PASSTHROUGH_FEE_TITLES);
  return new Set(
    raw
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

/**
 * Payments that are actually the team's money.
 *
 * A payment is excluded when the fee it pays carries a pass-through title.
 * Payments whose fee isn't in `fees` are also excluded — without the fee we
 * can't know the title, and silently counting unknown money as revenue is the
 * failure mode this whole module exists to prevent.
 */
export function teamDuesPayments(
  payments: PaymentLike[],
  fees: FeeLike[],
  passthroughTitles: Set<string>,
): PaymentLike[] {
  const titleByFeeId = new Map(fees.map((f) => [f.id, f.name]));
  return payments.filter((p) => {
    const title = titleByFeeId.get(p.fee_id);
    return title !== undefined && !passthroughTitles.has(title);
  });
}

export function duesRevenue(payments: PaymentLike[], fees: FeeLike[], passthroughTitles: Set<string>): number {
  return sumAmounts(teamDuesPayments(payments, fees, passthroughTitles));
}

export function duesRevenueInSeason(
  payments: PaymentLike[],
  fees: FeeLike[],
  passthroughTitles: Set<string>,
  season: Season,
): number {
  return sumInSeason(teamDuesPayments(payments, fees, passthroughTitles), paymentDate, (p) => p.amount, season);
}

export interface FeeTitleTotals {
  /** The fee's line-item name, e.g. "Season Dues" or "Preseason Tournament". */
  name: string;
  /** Total billed across every player carrying this line item. */
  owed: number;
  /** Total actually received against it. */
  collected: number;
  /** owed − collected, floored at 0 so overpayment never shows as negative debt. */
  outstanding: number;
  /** How many players carry this line item. */
  playerCount: number;
  /** Collected for the parent club rather than kept by the team. */
  passthrough: boolean;
}

/**
 * Roll fees up by line-item name: what each title bills, what it has collected,
 * and what is still outstanding.
 *
 * This is the view that makes the tournament pass-through readable — "Preseason
 * Tournament: $1,200 collected" sitting next to a $1,150 Tournament Fees expense
 * shows at a glance whether the tournament paid for itself or leaned on sponsor
 * money. Sorted by owed descending so the biggest line items lead.
 */
export function duesByFeeTitle(
  fees: FeeLike[],
  payments: PaymentLike[],
  passthroughTitles: Set<string> = new Set(),
): FeeTitleTotals[] {
  // Index payments by fee once rather than scanning the list per fee; a club
  // season is only a few hundred rows, but this is also called per render.
  const paidByFee = new Map<number, number>();
  for (const p of payments) {
    paidByFee.set(p.fee_id, (paidByFee.get(p.fee_id) || 0) + num(p.amount));
  }

  const byName = new Map<string, { owed: number; collected: number; players: Set<number> }>();
  for (const fee of fees) {
    const entry = byName.get(fee.name) || { owed: 0, collected: 0, players: new Set<number>() };
    entry.owed += num(fee.amount);
    entry.collected += paidByFee.get(fee.id) || 0;
    // Fall back to the fee id so a fee with no player_id still counts as one row.
    entry.players.add(fee.player_id ?? fee.id);
    byName.set(fee.name, entry);
  }

  return [...byName.entries()]
    .map(([name, e]) => ({
      name,
      owed: e.owed,
      collected: e.collected,
      outstanding: Math.max(0, e.owed - e.collected),
      playerCount: e.players.size,
      passthrough: passthroughTitles.has(name),
    }))
    .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------- club rollup

export interface DatedAmountRow {
  amount: number | string | null | undefined;
  [key: string]: unknown;
}

export interface ClubFinanceInput {
  sponsorships: SponsorshipLike[];
  income: { amount: number | string | null | undefined; income_date?: string | null }[];
  duesPayments: PaymentLike[];
  /** Needed to resolve each payment's fee title for the pass-through split. */
  duesFees: FeeLike[];
  /** Fee titles handed to the parent club; excluded from revenue. */
  passthroughFeeTitles: Set<string>;
  expenses: { amount: number | string | null | undefined; expense_date?: string | null }[];
}

export interface ClubTotals {
  /** Cash sponsorships, all time. */
  sponsors: number;
  /** `income` table, all time. */
  fundraising: number;
  /** Dues the team keeps, all time (pass-through titles excluded). */
  dues: number;
  /** Dues collected on the parent club's behalf. Reported, never in `revenue`. */
  passthroughDues: number;
  /** sponsors + fundraising + dues. */
  revenue: number;
  /** Every expense ever booked. */
  expenses: number;
  /** revenue − expenses: the running bank balance, which rolls over seasons. */
  balance: number;
}

/**
 * All-time club position. The balance is deliberately never season-scoped —
 * money left over at the end of a season is still in the account at the start
 * of the next one, so scoping it would make funds vanish each September.
 */
export function computeClubTotals({
  sponsorships,
  income,
  duesPayments,
  duesFees,
  passthroughFeeTitles,
  expenses,
}: ClubFinanceInput): ClubTotals {
  const sponsors = sponsorRevenue(sponsorships);
  const fundraising = sumAmounts(income);
  const dues = duesRevenue(duesPayments, duesFees, passthroughFeeTitles);
  const passthroughDues = sumAmounts(duesPayments) - dues;
  const revenue = sponsors + fundraising + dues;
  const totalExpenses = sumAmounts(expenses);
  return { sponsors, fundraising, dues, passthroughDues, revenue, expenses: totalExpenses, balance: revenue - totalExpenses };
}

export interface SeasonTotals {
  sponsors: number;
  fundraising: number;
  dues: number;
  /** Collected for the parent club this season. Reported, never in `revenue`. */
  passthroughDues: number;
  revenue: number;
  expenses: number;
  /** Season revenue − season expenses. Not the bank balance; see `ClubTotals`. */
  net: number;
}

/** The same rollup narrowed to one season, for the per-season cards and trend. */
export function computeSeasonTotals(
  { sponsorships, income, duesPayments, duesFees, passthroughFeeTitles, expenses }: ClubFinanceInput,
  season: Season,
): SeasonTotals {
  const sponsors = sponsorRevenueInSeason(sponsorships, season);
  const fundraising = sumInSeason(income, (i) => i.income_date, (i) => i.amount, season);
  const dues = duesRevenueInSeason(duesPayments, duesFees, passthroughFeeTitles, season);
  const allSeasonDues = sumInSeason(duesPayments, paymentDate, (p) => p.amount, season);
  const revenue = sponsors + fundraising + dues;
  const seasonExpenses = sumInSeason(expenses, (e) => e.expense_date, (e) => e.amount, season);
  return {
    sponsors,
    fundraising,
    dues,
    passthroughDues: allSeasonDues - dues,
    revenue,
    expenses: seasonExpenses,
    net: revenue - seasonExpenses,
  };
}

/** Expense totals by category, biggest first — feeds the breakdown chart. */
export function expensesByCategory(
  expenses: { amount: number | string | null | undefined; category?: string | null }[],
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const name = e.category || 'Other';
    map.set(name, (map.get(name) || 0) + num(e.amount));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/**
 * Share of billed dues actually collected, 0–100. Returns null when nothing is
 * billed, so callers can show "—" rather than a meaningless 0%.
 */
export function duesCollectionRate(fees: FeeLike[], payments: PaymentLike[]): number | null {
  const owed = sumAmounts(fees);
  if (owed <= 0) return null;
  const collected = sumAmounts(payments);
  return Math.min(100, (collected / owed) * 100);
}

/**
 * Signed currency, e.g. `-$1,234.00` rather than `$-1,234.00`.
 *
 * `Intl` puts the minus inside the symbol for accounting-style output in some
 * locales; the dashboard was rendering a raw `$` + `toLocaleString`, which put
 * it in the wrong place outright. Kept here beside the math that produces
 * negative balances.
 */
export function formatSignedMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
