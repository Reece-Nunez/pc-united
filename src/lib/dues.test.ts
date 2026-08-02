import { describe, it, expect } from 'vitest';
import { computePlayerDues, feePaid, feeBalance, duesStatus } from './dues';

describe('computePlayerDues', () => {
  it('adds multiple fees instead of overwriting (the reported bug)', () => {
    // Coach adds a $25 Friendlies fee, then a $400 Club fee. Under the old
    // single-row model the $400 replaced the $25; here they must sum to $425.
    const fees = [
      { id: 1, amount: 25 },
      { id: 2, amount: 400 },
    ];
    const totals = computePlayerDues(fees, []);
    expect(totals.owed).toBe(425);
    expect(totals.paid).toBe(0);
    expect(totals.balance).toBe(425);
  });

  it('allocates a payment to its own fee, not the whole balance', () => {
    // $25 received for Friendlies must not reduce the $400 club-fee balance.
    const fees = [
      { id: 1, amount: 25 }, // Friendlies
      { id: 2, amount: 400 }, // Club fee
    ];
    const payments = [{ fee_id: 1, amount: 25 }];
    const totals = computePlayerDues(fees, payments);
    expect(totals.paid).toBe(25);
    expect(totals.balance).toBe(400);
    expect(feeBalance(fees[0], payments)).toBe(0); // Friendlies settled
    expect(feeBalance(fees[1], payments)).toBe(400); // Club fee untouched
  });

  it('ignores payments belonging to other players/fees', () => {
    const fees = [{ id: 5, amount: 100 }];
    const payments = [
      { fee_id: 5, amount: 40 },
      { fee_id: 99, amount: 1000 }, // another player's fee
    ];
    expect(computePlayerDues(fees, payments).paid).toBe(40);
  });

  it('sums several payments toward one fee', () => {
    const payments = [
      { fee_id: 1, amount: 10 },
      { fee_id: 1, amount: 15 },
    ];
    expect(feePaid(1, payments)).toBe(25);
  });

  it('coerces string amounts from the DB (numeric columns)', () => {
    const totals = computePlayerDues(
      [{ id: 1, amount: '400' }],
      [{ fee_id: 1, amount: '100.50' }],
    );
    expect(totals.owed).toBe(400);
    expect(totals.paid).toBe(100.5);
    expect(totals.balance).toBe(299.5);
  });

  it('handles a player with no fees', () => {
    expect(computePlayerDues([], [])).toEqual({ owed: 0, paid: 0, balance: 0 });
  });
});

describe('duesStatus', () => {
  it('returns null when nothing is owed', () => {
    expect(duesStatus(0, 0)).toBeNull();
  });
  it('is unpaid at zero paid', () => {
    expect(duesStatus(400, 0)).toBe('unpaid');
  });
  it('is partial between zero and full', () => {
    expect(duesStatus(400, 25)).toBe('partial');
  });
  it('is paid when covered (incl. overpayment)', () => {
    expect(duesStatus(400, 400)).toBe('paid');
    expect(duesStatus(400, 450)).toBe('paid');
  });
});
