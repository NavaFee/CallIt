import {
  evaluateOracleHealth,
  expiryLabel,
  nearestStrike,
  payoutMultiplier,
  sizeStake,
  usdToFixed,
  type MarketParams,
  type OracleRow,
} from '@callit/core';
import { indexer, oracleCache, predictService } from './clients';

/** Wire shape consumed by the play screen poll. */
export interface MarketSnapshot {
  at: number;
  /** stale = served from disk cache because the indexer was slow */
  oracleListStale: boolean;
  oracles: OracleSnapshot[];
}

export interface OracleSnapshot {
  oracleId: string;
  underlying: string;
  expiryMs: number;
  expiryLabel: string;
  minStrike: string;
  tickSize: string;
  tradeable: boolean;
  fuse?: { reason: string; detail: string };
  spotUsd?: number;
  priceAgeMs?: number;
  sviAgeMs?: number;
}

let snapshotCache: { at: number; value: MarketSnapshot } | null = null;
const SNAPSHOT_TTL_MS = 2_000;

/** Health-annotated active oracle list, memoized for 2s across clients. */
export async function marketSnapshot(): Promise<MarketSnapshot> {
  const now = Date.now();
  if (snapshotCache && now - snapshotCache.at < SNAPSHOT_TTL_MS) return snapshotCache.value;

  const { rows: active, stale } = await oracleCache.getActive();
  const oracles = await Promise.all(
    active.map(async (oracle): Promise<OracleSnapshot> => {
      const base = {
        oracleId: oracle.oracle_id,
        underlying: oracle.underlying_asset,
        expiryMs: Number(oracle.expiry),
        expiryLabel: expiryLabel(oracle),
        minStrike: String(oracle.min_strike),
        tickSize: String(oracle.tick_size),
      };
      try {
        const state = await indexer.oracleState(oracle.oracle_id);
        const health = evaluateOracleHealth(state);
        if (health.tradeable) {
          return {
            ...base,
            tradeable: true,
            spotUsd: health.spotUsd,
            priceAgeMs: health.priceAgeMs,
            sviAgeMs: health.sviAgeMs,
          };
        }
        return { ...base, tradeable: false, fuse: { reason: health.reason, detail: health.detail } };
      } catch (err) {
        return {
          ...base,
          tradeable: false,
          fuse: { reason: 'indexer_error', detail: err instanceof Error ? err.message : String(err) },
        };
      }
    }),
  );

  const value: MarketSnapshot = { at: now, oracleListStale: stale, oracles };
  snapshotCache = { at: now, value };
  return value;
}

export interface QuoteResponse {
  oracleId: string;
  strike: string;
  strikeUsd: number;
  spotUsd: number;
  stakeUnits: string;
  at: number;
  up: SideQuote;
  down: SideQuote;
}

export interface SideQuote {
  askFixed: string;
  multiplier: number;
  quantityUnits: string;
  costUnits: string;
}

/** Two-sided ATM quote at the protocol's live pricing for a given stake. */
export async function quoteBothSides(oracleId: string, stakeUnits: bigint): Promise<QuoteResponse> {
  const state = await indexer.oracleState(oracleId);
  const health = evaluateOracleHealth(state);
  if (!health.tradeable) {
    throw new Error(`oracle not tradeable: ${health.reason}`);
  }
  const oracle = state.oracle;
  const strike = nearestStrike(
    usdToFixed(health.spotUsd),
    BigInt(oracle.min_strike),
    BigInt(oracle.tick_size),
  );

  const sideQuote = async (isUp: boolean): Promise<SideQuote> => {
    const market: MarketParams = {
      oracleId,
      expiry: BigInt(oracle.expiry),
      strike,
      isUp,
    };
    // same sizing the bet executes with — preview always matches the debit
    const sized = await sizeStake(predictService, market, stakeUnits);
    return {
      askFixed: sized.askPrice.toString(),
      multiplier: payoutMultiplier(sized.askPrice),
      quantityUnits: sized.quantityUnits.toString(),
      costUnits: sized.costUnits.toString(),
    };
  };

  const [up, down] = await Promise.all([sideQuote(true), sideQuote(false)]);
  return {
    oracleId,
    strike: strike.toString(),
    strikeUsd: Number(strike) / 1e9,
    spotUsd: health.spotUsd,
    stakeUnits: stakeUnits.toString(),
    at: Date.now(),
    up,
    down,
  };
}

export function pickDefaultOracle(oracles: OracleRow[]): OracleRow | null {
  return oracles[0] ?? null;
}
