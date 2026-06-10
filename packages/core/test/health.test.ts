import { describe, expect, it } from 'vitest';
import { evaluateOracleHealth, expiryLabel } from '../src/health.js';
import type { OracleRow, OracleStateResponse } from '../src/indexer/types.js';

const NOW = 1_781_100_000_000; // 2026-06-10 ~14:00 UTC

function makeOracle(overrides: Partial<OracleRow> = {}): OracleRow {
  return {
    predict_id: '0xpredict',
    oracle_id: '0xoracle',
    oracle_cap_id: '0xcap',
    underlying_asset: 'BTC',
    expiry: NOW + 48 * 3600_000,
    min_strike: '50000000000000',
    tick_size: '1000000000',
    status: 'active',
    activated_at: NOW - 86_400_000,
    settlement_price: null,
    settled_at: null,
    ...overrides,
  };
}

function makeState(opts: {
  oracle?: Partial<OracleRow>;
  priceAgeMs?: number | null;
  sviAgeMs?: number | null;
}): OracleStateResponse {
  const envelope = {
    event_digest: 'e',
    digest: 'd',
    sender: '0xfeeder',
    checkpoint: 1,
    checkpoint_timestamp_ms: NOW,
    package: '0xpkg',
  };
  return {
    oracle: makeOracle(opts.oracle),
    latest_price:
      opts.priceAgeMs == null
        ? null
        : {
            ...envelope,
            oracle_id: '0xoracle',
            spot: '61351520000000',
            forward: '61346167000000',
            onchain_timestamp: NOW - opts.priceAgeMs,
          },
    latest_svi:
      opts.sviAgeMs == null
        ? null
        : {
            ...envelope,
            oracle_id: '0xoracle',
            a: '708196',
            b: '20916796',
            rho: '278136100',
            rho_negative: true,
            m: '23775160',
            m_negative: false,
            sigma: '32833893',
            onchain_timestamp: NOW - opts.sviAgeMs,
          },
    ask_bounds: null,
  };
}

describe('oracle health fuse', () => {
  it('is tradeable with fresh feeds', () => {
    const health = evaluateOracleHealth(makeState({ priceAgeMs: 10_000, sviAgeMs: 15_000 }), NOW);
    expect(health.tradeable).toBe(true);
    if (health.tradeable) {
      expect(health.spotUsd).toBeCloseTo(61351.52);
    }
  });

  it('trips on stale price feed before the protocol 30s cutoff', () => {
    const health = evaluateOracleHealth(makeState({ priceAgeMs: 26_000, sviAgeMs: 5_000 }), NOW);
    expect(health).toMatchObject({ tradeable: false, reason: 'price_stale' });
  });

  it('trips on stale SVI feed', () => {
    const health = evaluateOracleHealth(makeState({ priceAgeMs: 5_000, sviAgeMs: 60_000 }), NOW);
    expect(health).toMatchObject({ tradeable: false, reason: 'svi_stale' });
  });

  it('trips when oracle is settled', () => {
    const health = evaluateOracleHealth(
      makeState({ oracle: { status: 'settled' }, priceAgeMs: 1_000, sviAgeMs: 1_000 }),
      NOW,
    );
    expect(health).toMatchObject({ tradeable: false, reason: 'not_active' });
  });

  it('trips when expiry has passed even if status lags', () => {
    const health = evaluateOracleHealth(
      makeState({ oracle: { expiry: NOW - 1 }, priceAgeMs: 1_000, sviAgeMs: 1_000 }),
      NOW,
    );
    expect(health).toMatchObject({ tradeable: false, reason: 'expired' });
  });

  it('trips when feeds are missing entirely', () => {
    const health = evaluateOracleHealth(makeState({ priceAgeMs: null, sviAgeMs: null }), NOW);
    expect(health).toMatchObject({ tradeable: false, reason: 'missing_feed' });
  });
});

describe('expiry labels', () => {
  it('formats days/hours/minutes', () => {
    expect(expiryLabel(makeOracle({ expiry: NOW + 50 * 3600_000 }), NOW)).toBe('2d 2h');
    expect(expiryLabel(makeOracle({ expiry: NOW + 90 * 60_000 }), NOW)).toBe('1h 30m');
    expect(expiryLabel(makeOracle({ expiry: NOW + 14 * 60_000 }), NOW)).toBe('14m');
    expect(expiryLabel(makeOracle({ expiry: NOW - 1000 }), NOW)).toBe('expired');
  });
});
