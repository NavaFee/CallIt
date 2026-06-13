import { describe, expect, it } from 'vitest';
import { renderSettlementCardPng } from '../src/card.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('settlement card PNG renderer', () => {
  it('renders a win card with streak, multiplier, tx and balance', async () => {
    const png = await renderSettlementCardPng({
      won: true,
      payoutDusdc: 19.84,
      costDusdc: 10,
      isUp: true,
      strikeUsd: 61417,
      settleUsd: 61890,
      streak: 3,
      txDigest: 'BGtfqMr69vS3wg2jMaS4cQ7DgMgnawRForTnEJkRCVtB',
      balanceDusdc: 42.5,
    });
    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(png.length).toBeGreaterThan(20_000); // a real card, not a blank frame
  }, 30_000);

  it('renders a loss card without optional fields', async () => {
    const png = await renderSettlementCardPng({
      won: false,
      payoutDusdc: 0,
      costDusdc: 5,
      isUp: false,
      strikeUsd: 61417,
      settleUsd: 61203,
      streak: 0,
    });
    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(png.length).toBeGreaterThan(20_000);
  }, 30_000);
});
