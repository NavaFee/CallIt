import os from 'node:os';
import path from 'node:path';
import {
  OracleCache,
  PredictIndexerClient,
  PredictService,
  loadConfig,
} from '@callit/core';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

/**
 * Server-side singletons. Next.js route handlers share module scope per
 * server instance, so clients and the oracle cache survive across requests
 * on a warm instance.
 */
export const cfg = loadConfig();

export const suiClient = new SuiJsonRpcClient({
  url: cfg.rpcUrl ?? getJsonRpcFullnodeUrl('testnet'),
  network: cfg.network,
});

export const indexer = new PredictIndexerClient(cfg.indexerUrl);

export const predictService = new PredictService(suiClient, cfg);

// tmpdir works on Vercel (per-instance) and locally; stale-on-error keeps
// the play screen alive when the heavy /oracles endpoint crawls
export const oracleCache = new OracleCache(indexer, cfg.predictObjectId, {
  cacheFile: path.join(os.tmpdir(), 'callit-oracles.json'),
});

export const MOCK_FUNDS = process.env.MOCK_FUNDS === '1';

/** bigint-safe JSON: bigints become decimal strings. */
export function jsonSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}
