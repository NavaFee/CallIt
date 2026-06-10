import { describe, expect, it } from 'vitest';
import {
  dusdcToUnits,
  fixedToUsd,
  mintCost,
  nearestStrike,
  payoutMultiplier,
  stakeToQuantity,
  unitsToDusdc,
  usdToFixed,
} from '../src/units.js';

describe('fixed-point conversions', () => {
  it('round-trips USD prices through 1e9 fixed point', () => {
    expect(usdToFixed(61351.52)).toBe(61_351_520_000_000n);
    expect(fixedToUsd(61_351_520_000_000n)).toBeCloseTo(61351.52);
  });

  it('round-trips dUSDC amounts through 1e6 units', () => {
    expect(dusdcToUnits(10)).toBe(10_000_000n);
    expect(dusdcToUnits(0.5)).toBe(500_000n);
    expect(unitsToDusdc(10_000_000n)).toBe(10);
  });
});

describe('mint cost and multiplier', () => {
  it('cost = ask × quantity / 1e9', () => {
    // ask 0.5 on 10 dUSDC notional costs 5 dUSDC
    expect(mintCost(500_000_000n, 10_000_000n)).toBe(5_000_000n);
    // ask 0.659565176 (live sample from testnet) on 1 dUSDC notional
    expect(mintCost(659_565_176n, 1_000_000n)).toBe(659_565n);
  });

  it('multiplier is payout per premium', () => {
    expect(payoutMultiplier(500_000_000n)).toBeCloseTo(2.0);
    expect(payoutMultiplier(400_000_000n)).toBeCloseTo(2.5);
    expect(payoutMultiplier(0n)).toBe(0);
  });

  it('stakeToQuantity inverts mintCost within rounding', () => {
    const ask = 659_565_176n;
    const stake = 5_000_000n; // 5 dUSDC premium
    const qty = stakeToQuantity(stake, ask);
    expect(qty).toBe(7_580_751n);
    // re-derived cost never exceeds the stake
    expect(mintCost(ask, qty)).toBeLessThanOrEqual(stake);
  });
});

describe('strike grid', () => {
  const MIN = 50_000_000_000_000n; // $50,000
  const TICK = 1_000_000_000n; // $1

  it('snaps spot to nearest $1 strike', () => {
    expect(nearestStrike(usdToFixed(61351.52), MIN, TICK)).toBe(usdToFixed(61352));
    expect(nearestStrike(usdToFixed(61351.49), MIN, TICK)).toBe(usdToFixed(61351));
  });

  it('clamps below the grid minimum', () => {
    expect(nearestStrike(usdToFixed(42_000), MIN, TICK)).toBe(MIN);
  });

  it('always lands on the grid', () => {
    const s = nearestStrike(usdToFixed(98765.4321), MIN, TICK);
    expect((s - MIN) % TICK).toBe(0n);
  });
});
