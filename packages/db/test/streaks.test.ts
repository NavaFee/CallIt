import { describe, expect, it } from 'vitest';
import { applyResult, earnedBadges, flameTier, weekKey } from '../src/streaks.js';

describe('streak state machine', () => {
  it('increments on win and tracks best', () => {
    let s = { current: 0, best: 0 };
    s = applyResult(s, 'won');
    s = applyResult(s, 'won');
    expect(s).toEqual({ current: 2, best: 2 });
  });

  it('resets to zero on loss but keeps best', () => {
    let s = { current: 4, best: 4 };
    s = applyResult(s, 'lost');
    expect(s).toEqual({ current: 0, best: 4 });
  });

  it('cash-out leaves the streak untouched', () => {
    const s = applyResult({ current: 3, best: 5 }, 'cashed_out');
    expect(s).toEqual({ current: 3, best: 5 });
  });

  it('best never decreases', () => {
    let s = { current: 0, best: 0 };
    for (const r of ['won', 'won', 'won', 'lost', 'won'] as const) s = applyResult(s, r);
    expect(s).toEqual({ current: 1, best: 3 });
  });
});

describe('flame tiers', () => {
  it('maps streaks to tiers per the design spec', () => {
    expect(flameTier(0)).toBe(0);
    expect(flameTier(2)).toBe(0);
    expect(flameTier(3)).toBe(1);
    expect(flameTier(5)).toBe(2);
    expect(flameTier(7)).toBe(3);
    expect(flameTier(12)).toBe(3);
  });
});

describe('badges', () => {
  it('unlocks each badge at its threshold', () => {
    expect(
      earnedBadges({ calls: 0, wins: 0, cashouts: 0, bestStreak: 0, maxStakeUnits: 0n }),
    ).toEqual([]);
    expect(
      earnedBadges({ calls: 1, wins: 0, cashouts: 0, bestStreak: 0, maxStakeUnits: 1_000_000n }),
    ).toEqual(['first']);
    expect(
      earnedBadges({ calls: 20, wins: 10, cashouts: 1, bestStreak: 5, maxStakeUnits: 25_000_000n }),
    ).toEqual(['first', 'hat', 'fire', 'exit', 'whale', 'sharp']);
  });

  it('whale requires the full 25 dUSDC stake', () => {
    const base = { calls: 1, wins: 0, cashouts: 0, bestStreak: 0 };
    expect(earnedBadges({ ...base, maxStakeUnits: 24_000_000n })).not.toContain('whale');
    expect(earnedBadges({ ...base, maxStakeUnits: 24_500_000n })).toContain('whale');
  });
});

describe('week keys', () => {
  it('formats ISO weeks', () => {
    expect(weekKey(new Date('2026-06-10T12:00:00Z'))).toBe('2026-W24');
    expect(weekKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
  });
});
