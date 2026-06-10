/**
 * Response shapes of the public predict-server indexer
 * (https://predict-server.testnet.mystenlabs.com), captured live 2026-06-10.
 * Numeric u64 fields arrive as JSON numbers or strings depending on size;
 * we keep them as `string | number` at the wire level and normalize in the client.
 */

export type U64 = string | number;

export interface IndexerStatus {
  status: string;
  latest_onchain_checkpoint: number;
  current_time_ms: number;
  max_checkpoint_lag: number;
  max_time_lag_seconds: number;
  pipelines: Array<{
    pipeline: string;
    checkpoint_lag: number;
    time_lag_seconds: number;
  }>;
}

export type OracleStatus = 'created' | 'active' | 'settled';

export interface OracleRow {
  predict_id: string;
  oracle_id: string;
  oracle_cap_id: string;
  underlying_asset: string;
  /** expiry timestamp in ms */
  expiry: U64;
  /** strike grid, 1e9 fixed-point */
  min_strike: U64;
  tick_size: U64;
  status: OracleStatus;
  activated_at: U64 | null;
  settlement_price: U64 | null;
  settled_at: U64 | null;
}

/** Envelope fields shared by all event-derived rows. */
export interface EventEnvelope {
  event_digest: string;
  digest: string;
  sender: string;
  checkpoint: number;
  checkpoint_timestamp_ms: number;
  package: string;
}

export interface OraclePriceRow extends EventEnvelope {
  oracle_id: string;
  spot: U64;
  forward: U64;
  onchain_timestamp: U64;
}

export interface OracleSviRow extends EventEnvelope {
  oracle_id: string;
  a: U64;
  b: U64;
  rho: U64;
  rho_negative: boolean;
  m: U64;
  m_negative: boolean;
  sigma: U64;
  onchain_timestamp: U64;
}

export interface OracleStateResponse {
  oracle: OracleRow;
  latest_price: OraclePriceRow | null;
  latest_svi: OracleSviRow | null;
  ask_bounds: { min_ask_price: U64; max_ask_price: U64 } | null;
}

export interface ManagerRow extends EventEnvelope {
  manager_id: string;
  owner: string;
}

export interface PositionMintedRow extends EventEnvelope {
  predict_id: string;
  manager_id: string;
  trader: string;
  quote_asset: string;
  oracle_id: string;
  expiry: U64;
  strike: U64;
  is_up: boolean;
  quantity: U64;
  cost: U64;
  ask_price: U64;
}

export interface PositionRedeemedRow extends EventEnvelope {
  predict_id: string;
  manager_id: string;
  owner: string;
  executor: string;
  quote_asset: string;
  oracle_id: string;
  expiry: U64;
  strike: U64;
  is_up: boolean;
  quantity: U64;
  payout: U64;
  bid_price: U64;
  is_settled: boolean;
}
