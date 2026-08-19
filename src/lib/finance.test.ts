import { describe, it, expect } from 'vitest';
import {
  sumAmounts,
  sumInSeason,
  isCashSponsorship,
  sponsorRevenue,
  sponsorRevenueInSeason,
  duesRevenue,
  teamDuesPayments,
  parsePassthroughFeeTitles,
  DEFAULT_PASSTHROUGH_FEE_TITLES,
  duesByFeeTitle,
  computeClubTotals,
  computeSeasonTotals,
  expensesByCategory,
  duesCollectionRate,
  formatSignedMoney,
} from './finance';
import { getSeasonForDate } from './seasons';

// Fall 2026 runs Sep 6 – Nov 15 (see src/lib/seasons.ts).
const fall2026 = getSeasonForDate(new Date(2026, 8, 20));
const summer2026 = getSeasonForDate(new Date(2026, 5, 15));

describe('sumAmounts', () => {
  it('coerces the string amounts Postgres numeric columns can return', () => {
    // The expenses page previously used `sum + (s.amount || 0)` with no
    // coercion; on string input that concatenates ("0" + "500" = "0500")
    // instead of adding. This is the regression pin for that.
    expect(sumAmounts([{ amount: '500' }, { amount: '250.50' }])).toBe(750.5);
  });

  it('treats null, undefined and junk as zero rather than NaN', () => {
    expect(sumAmounts([{ amount: null }, { amount: undefined }, { amount: 'abc' }, { amount: 10 }])).toBe(10);
  });

  it('is zero for an empty list', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('isCashSponsorship', () => {
  it('counts approved and completed', () => {
    expect(isCashSponsorship({ amount: 500, status: 'approved', payment_method: 'Check' })).toBe(true);
    expect(isCashSponsorship({ amount: 500, status: 'completed', payment_method: 'Check' })).toBe(true);
  });

  it('excludes pending, including when status is missing entirely', () => {
    expect(isCashSponsorship({ amount: 500, status: 'pending', payment_method: 'Check' })).toBe(false);
    expect(isCashSponsorship({ amount: 500, payment_method: 'Check' })).toBe(false);
  });

  it('excludes in-kind services, which are value but not spendable money', () => {
    expect(isCashSponsorship({ amount: 2500, status: 'approved', payment_method: 'Services/In-Kind' })).toBe(false);
  });
});

describe('sponsorRevenue', () => {
  it('sums only cash sponsorships', () => {
    const sponsorships = [
      { amount: 2500, status: 'approved', payment_method: 'Check' },
      { amount: 1000, status: 'completed', payment_method: 'Venmo' },
      { amount: 500, status: 'pending', payment_method: 'Check' }, // not agreed yet
      { amount: 5000, status: 'approved', payment_method: 'Services/In-Kind' }, // not cash
    ];
    expect(sponsorRevenue(sponsorships)).toBe(3500);
  });

  it('agrees across string and number amounts', () => {
    const asNumbers = [{ amount: 2500, status: 'approved', payment_method: 'Check' }];
    const asStrings = [{ amount: '2500', status: 'approved', payment_method: 'Check' }];
    expect(sponsorRevenue(asStrings)).toBe(sponsorRevenue(asNumbers));
  });
});

describe('sumInSeason', () => {
  it('includes only rows dated inside the season', () => {
    const rows = [
      { amount: 100, on: '2026-09-20' }, // Fall 2026
      { amount: 200, on: '2026-07-04' }, // Summer 2026
      { amount: 400, on: '2026-11-10' }, // Fall 2026
    ];
    expect(sumInSeason(rows, (r) => r.on, (r) => r.amount, fall2026)).toBe(500);
  });

  it('skips undated rows instead of counting them everywhere', () => {
    const rows = [{ amount: 100, on: '2026-09-20' }, { amount: 999, on: null }];
    expect(sumInSeason(rows, (r) => r.on, (r) => r.amount, fall2026)).toBe(100);
  });

  it('respects the season boundary exactly (Sep 6 opens Fall)', () => {
    const rows = [
      { amount: 10, on: '2026-09-05' }, // still Summer
      { amount: 20, on: '2026-09-06' }, // first day of Fall
    ];
    expect(sumInSeason(rows, (r) => r.on, (r) => r.amount, fall2026)).toBe(20);
    expect(sumInSeason(rows, (r) => r.on, (r) => r.amount, summer2026)).toBe(10);
  });
});

describe('sponsorRevenueInSeason', () => {
  it('scopes by created_at and still applies the cash filter', () => {
    const sponsorships = [
      { amount: 1000, status: 'approved', payment_method: 'Check', created_at: '2026-09-20' },
      { amount: 500, status: 'pending', payment_method: 'Check', created_at: '2026-09-21' },
      { amount: 700, status: 'approved', payment_method: 'Check', created_at: '2026-07-01' },
    ];
    expect(sponsorRevenueInSeason(sponsorships, fall2026)).toBe(1000);
  });
});

describe('pass-through dues', () => {
  const fees = [
    { id: 1, name: 'Season Dues', amount: 100, player_id: 10 },
    { id: 2, name: 'Preseason Tournament', amount: 25, player_id: 10 },
  ];
  const payments = [
    { fee_id: 1, amount: 100 }, // handed to the parent club
    { fee_id: 2, amount: 25 },  // the team's money, pays a tournament expense
  ];
  const passthrough = new Set(['Season Dues']);

  it('excludes season dues, which belong to the parent club', () => {
    // The team collects these and passes them on, so counting them would show
    // money on the balance that the team cannot spend.
    expect(duesRevenue(payments, fees, passthrough)).toBe(25);
  });

  it('keeps tournament fees, whose matching expense is already booked', () => {
    const kept = teamDuesPayments(payments, fees, passthrough);
    expect(kept).toHaveLength(1);
    expect(kept[0].fee_id).toBe(2);
  });

  it('counts everything when nothing is marked pass-through', () => {
    expect(duesRevenue(payments, fees, new Set())).toBe(125);
  });

  it('drops payments whose fee is unknown rather than assuming revenue', () => {
    // Without the fee row the title is unknowable; guessing "revenue" is the
    // exact failure this module exists to prevent.
    expect(duesRevenue([{ fee_id: 999, amount: 5000 }], fees, passthrough)).toBe(0);
  });
});

describe('parsePassthroughFeeTitles', () => {
  it('falls back to the default when unset or blank', () => {
    expect([...parsePassthroughFeeTitles(undefined)]).toEqual(DEFAULT_PASSTHROUGH_FEE_TITLES);
    expect([...parsePassthroughFeeTitles('   ')]).toEqual(DEFAULT_PASSTHROUGH_FEE_TITLES);
  });

  it('splits on commas and newlines, trimming each title', () => {
    expect([...parsePassthroughFeeTitles('Season Dues, Club Fee')]).toEqual(['Season Dues', 'Club Fee']);
    expect([...parsePassthroughFeeTitles('Season Dues\n Club Fee ')]).toEqual(['Season Dues', 'Club Fee']);
  });

  it('ignores empty entries from trailing separators', () => {
    expect([...parsePassthroughFeeTitles('Season Dues,,')]).toEqual(['Season Dues']);
  });
});

describe('duesByFeeTitle', () => {
  const fees = [
    { id: 1, name: 'Season Dues', amount: 95, player_id: 10 },
    { id: 2, name: 'Season Dues', amount: 95, player_id: 11 },
    { id: 3, name: 'Preseason Tournament', amount: 25, player_id: 10 },
    { id: 4, name: 'Preseason Tournament', amount: 25, player_id: 11 },
  ];
  const payments = [
    { fee_id: 1, amount: 95 }, // player 10 paid season dues in full
    { fee_id: 2, amount: 40 }, // player 11 part-paid
    { fee_id: 3, amount: 25 }, // player 10 paid the tournament
  ];

  it('groups fees by title and sums owed and collected independently', () => {
    const rows = duesByFeeTitle(fees, payments);
    const dues = rows.find((r) => r.name === 'Season Dues')!;
    const tourney = rows.find((r) => r.name === 'Preseason Tournament')!;

    expect(dues).toMatchObject({ owed: 190, collected: 135, outstanding: 55, playerCount: 2 });
    expect(tourney).toMatchObject({ owed: 50, collected: 25, outstanding: 25, playerCount: 2 });
  });

  it('sorts by owed descending so the biggest line item leads', () => {
    expect(duesByFeeTitle(fees, payments).map((r) => r.name)).toEqual(['Season Dues', 'Preseason Tournament']);
  });

  it('never reports negative outstanding when a fee is overpaid', () => {
    const rows = duesByFeeTitle([{ id: 1, name: 'Season Dues', amount: 95, player_id: 10 }], [{ fee_id: 1, amount: 120 }]);
    expect(rows[0].collected).toBe(120);
    expect(rows[0].outstanding).toBe(0);
  });

  it('ignores payments pointing at fees outside the supplied set', () => {
    const rows = duesByFeeTitle(
      [{ id: 1, name: 'Season Dues', amount: 95, player_id: 10 }],
      [{ fee_id: 1, amount: 95 }, { fee_id: 999, amount: 5000 }],
    );
    expect(rows[0].collected).toBe(95);
  });

  it('sums several payments toward the same fee', () => {
    const rows = duesByFeeTitle(
      [{ id: 1, name: 'Season Dues', amount: 95, player_id: 10 }],
      [{ fee_id: 1, amount: 50 }, { fee_id: 1, amount: 45 }],
    );
    expect(rows[0]).toMatchObject({ collected: 95, outstanding: 0 });
  });

  it('is empty when there are no fees', () => {
    expect(duesByFeeTitle([], [])).toEqual([]);
  });
});

describe('computeClubTotals', () => {
  const duesFees = [
    { id: 1, name: 'Season Dues', amount: 100, player_id: 10 },
    { id: 2, name: 'Preseason Tournament', amount: 25, player_id: 10 },
  ];
  const input = {
    sponsorships: [
      { amount: 2500, status: 'approved', payment_method: 'Check' },
      { amount: 5000, status: 'approved', payment_method: 'Services/In-Kind' }, // excluded
    ],
    income: [{ amount: 300 }, { amount: '150.25' }],
    duesPayments: [{ fee_id: 1, amount: 100 }, { fee_id: 2, amount: 25 }],
    duesFees,
    passthroughFeeTitles: new Set(['Season Dues']),
    expenses: [{ amount: 1000 }, { amount: '200' }],
  };

  it('counts fundraising and team dues, not just sponsorships', () => {
    // The dashboard bug: revenue was sponsorships alone, so both fundraising
    // and dues silently vanished from the balance.
    const totals = computeClubTotals(input);
    expect(totals.sponsors).toBe(2500);
    expect(totals.fundraising).toBe(450.25);
    expect(totals.dues).toBe(25);
    expect(totals.revenue).toBe(2975.25);
  });

  it('reports club pass-through dues separately, outside revenue', () => {
    const totals = computeClubTotals(input);
    expect(totals.passthroughDues).toBe(100);
    // Revenue is exactly the three kept streams — the pass-through total is
    // reported alongside it, never folded into it.
    expect(totals.sponsors + totals.fundraising + totals.dues).toBeCloseTo(totals.revenue, 10);
    expect(totals.revenue).toBe(2975.25);
  });

  it('balances revenue against all-time expenses', () => {
    const totals = computeClubTotals(input);
    expect(totals.expenses).toBe(1200);
    expect(totals.balance).toBe(1775.25);
  });

  it('goes negative when the team has overspent', () => {
    const totals = computeClubTotals({
      sponsorships: [], income: [], duesPayments: [], duesFees: [], passthroughFeeTitles: new Set(), expenses: [{ amount: 500 }],
    });
    expect(totals.balance).toBe(-500);
  });

  it('is all zeroes with no data at all', () => {
    const totals = computeClubTotals({
      sponsorships: [], income: [], duesPayments: [], duesFees: [], passthroughFeeTitles: new Set(), expenses: [],
    });
    expect(totals).toEqual({ sponsors: 0, fundraising: 0, dues: 0, passthroughDues: 0, revenue: 0, expenses: 0, balance: 0 });
  });
});

describe('computeSeasonTotals', () => {
  const duesFees = [
    { id: 1, name: 'Preseason Tournament', amount: 25, player_id: 10 },
    { id: 2, name: 'Preseason Tournament', amount: 25, player_id: 11 },
    { id: 3, name: 'Season Dues', amount: 100, player_id: 10 },
  ];
  const passthroughFeeTitles = new Set(['Season Dues']);

  it('narrows every stream to the season and nets them', () => {
    const totals = computeSeasonTotals(
      {
        sponsorships: [
          { amount: 1000, status: 'approved', payment_method: 'Check', created_at: '2026-09-20' },
          { amount: 800, status: 'approved', payment_method: 'Check', created_at: '2026-06-01' },
        ],
        income: [{ amount: 200, income_date: '2026-09-25' }, { amount: 90, income_date: '2026-06-02' }],
        duesPayments: [{ fee_id: 1, amount: 25, paid_on: '2026-09-10' }, { fee_id: 2, amount: 25, paid_on: '2026-06-03' }],
        duesFees,
        passthroughFeeTitles,
        expenses: [{ amount: 400, expense_date: '2026-09-30' }, { amount: 1000, expense_date: '2026-06-04' }],
      },
      fall2026,
    );

    expect(totals).toMatchObject({ sponsors: 1000, fundraising: 200, dues: 25, revenue: 1225, expenses: 400, net: 825 });
  });

  it('keeps season dues out of season revenue but still reports them', () => {
    const totals = computeSeasonTotals(
      {
        sponsorships: [],
        income: [],
        duesPayments: [{ fee_id: 3, amount: 100, paid_on: '2026-09-10' }, { fee_id: 1, amount: 25, paid_on: '2026-09-11' }],
        duesFees,
        passthroughFeeTitles,
        expenses: [],
      },
      fall2026,
    );
    expect(totals.dues).toBe(25);
    expect(totals.passthroughDues).toBe(100);
    expect(totals.revenue).toBe(25);
  });

  it('falls back to created_at when a payment has no paid_on date', () => {
    const totals = computeSeasonTotals(
      {
        sponsorships: [],
        income: [],
        duesPayments: [{ fee_id: 1, amount: 25, paid_on: null, created_at: '2026-09-10' }],
        duesFees,
        passthroughFeeTitles,
        expenses: [],
      },
      fall2026,
    );
    expect(totals.dues).toBe(25);
  });
});

describe('expensesByCategory', () => {
  it('totals per category, largest first', () => {
    const rows = expensesByCategory([
      { amount: 100, category: 'Uniforms' },
      { amount: 300, category: 'Travel' },
      { amount: 250, category: 'Uniforms' },
    ]);
    expect(rows).toEqual([
      { name: 'Uniforms', value: 350 },
      { name: 'Travel', value: 300 },
    ]);
  });

  it('buckets a missing category under Other rather than dropping it', () => {
    expect(expensesByCategory([{ amount: 50, category: null }])).toEqual([{ name: 'Other', value: 50 }]);
  });
});

describe('duesCollectionRate', () => {
  it('is the collected share of what was billed', () => {
    expect(duesCollectionRate([{ id: 1, name: 'Season Dues', amount: 200 }], [{ fee_id: 1, amount: 50 }])).toBe(25);
  });

  it('returns null when nothing is billed, so the UI can show a dash', () => {
    expect(duesCollectionRate([], [])).toBeNull();
  });

  it('caps at 100 so overpayment does not read as 120% collected', () => {
    expect(duesCollectionRate([{ id: 1, name: 'Season Dues', amount: 100 }], [{ fee_id: 1, amount: 120 }])).toBe(100);
  });
});

describe('formatSignedMoney', () => {
  it('puts the minus outside the dollar sign', () => {
    // The dashboard rendered `$-1,234.00` by concatenating "$" with a negative
    // toLocaleString result.
    expect(formatSignedMoney(-1234)).toBe('-$1,234.00');
  });

  it('formats positives and zero with two decimals', () => {
    expect(formatSignedMoney(1234.5)).toBe('$1,234.50');
    expect(formatSignedMoney(0)).toBe('$0.00');
  });
});
