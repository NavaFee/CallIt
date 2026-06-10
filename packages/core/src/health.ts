import { ORACLE_STALENESS_MS } from './config.js';
import type { OracleRow, OracleStateResponse } from './indexer/types.js';

/**
 * Oracle health fuse.
 *
 * The protocol rejects mints against an oracle whose feed is older than 30s
 * (EOracleStale). The UI must disable betting *before* the user signs a
 * doomed transaction, so we evaluate freshness client-side from the latest
 * price/SVI timestamps and surface a tradeable/not-tradeable verdict.
 */

export type OracleHealth =
  | { tradeable: true; spotUsd: number; priceAgeMs: number; sviAgeMs: number }
  | { tradeable: false; reason: OracleHealthReason; detail: string };

export type OracleHealthReason =
  | 'not_active'
  | 'expired'
  | 'price_stale'
  | 'svi_stale'
  | 'missing_feed';

/** Safety margin: flag as stale before the protocol's hard 30s cutoff. */
const CLIENT_STALENESS_MS = ORACLE_STALENESS_MS - 5_000;

export function evaluateOracleHealth(
  state: OracleStateResponse,
  nowMs: number = Date.now(),
): OracleHealth {
  const { oracle, latest_price, latest_svi } = state;

  if (oracle.status !== 'active') {
    return { tradeable: false, reason: 'not_active', detail: `oracle status is ${oracle.status}` };
  }
  if (nowMs >= Number(oracle.expiry)) {
    return { tradeable: false, reason: 'expired', detail: 'oracle expiry passed, awaiting settlement' };
  }
  if (!latest_price || !latest_svi) {
    return { tradeable: false, reason: 'missing_feed', detail: 'no price/SVI updates indexed yet' };
  }

  const priceAgeMs = nowMs - Number(latest_price.onchain_timestamp);
  const sviAgeMs = nowMs - Number(latest_svi.onchain_timestamp);

  if (priceAgeMs > CLIENT_STALENESS_MS) {
    return {
      tradeable: false,
      reason: 'price_stale',
      detail: `last price update ${Math.round(priceAgeMs / 1000)}s ago (limit ${CLIENT_STALENESS_MS / 1000}s)`,
    };
  }
  if (sviAgeMs > CLIENT_STALENESS_MS) {
    return {
      tradeable: false,
      reason: 'svi_stale',
      detail: `last SVI update ${Math.round(sviAgeMs / 1000)}s ago (limit ${CLIENT_STALENESS_MS / 1000}s)`,
    };
  }

  return {
    tradeable: true,
    spotUsd: Number(latest_price.spot) / 1e9,
    priceAgeMs,
    sviAgeMs,
  };
}

/** Human label for an expiry chip, e.g. "2d 4h" / "6h 12m" / "14m". */
export function expiryLabel(oracle: OracleRow, nowMs: number = Date.now()): string {
  const ms = Number(oracle.expiry) - nowMs;
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}
