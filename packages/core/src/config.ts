/**
 * Network + protocol configuration.
 *
 * Defaults are the verified Sui testnet deployment of DeepBook Predict
 * (branch `predict-testnet-4-16`, verified on-chain 2026-06-10).
 * Every value can be overridden via environment variables so a protocol
 * redeploy (or the future mainnet launch) is a config change, not a code change.
 */

export interface PredictConfig {
  network: 'testnet' | 'mainnet' | 'localnet';
  rpcUrl?: string;
  packageId: string;
  predictObjectId: string;
  indexerUrl: string;
  dusdcCoinType: string;
}

export const TESTNET_CONFIG: PredictConfig = {
  network: 'testnet',
  packageId: '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138',
  predictObjectId: '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a',
  indexerUrl: 'https://predict-server.testnet.mystenlabs.com',
  dusdcCoinType:
    '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC',
};

export const CLOCK_OBJECT_ID = '0x6';

/** Oracle feeds older than this are stale; the protocol rejects mints against them. */
export const ORACLE_STALENESS_MS = 30_000;

export function loadConfig(env: Record<string, string | undefined> = process.env): PredictConfig {
  return {
    network: (env.SUI_NETWORK as PredictConfig['network']) ?? TESTNET_CONFIG.network,
    rpcUrl: env.SUI_RPC_URL,
    packageId: env.PREDICT_PACKAGE_ID ?? TESTNET_CONFIG.packageId,
    predictObjectId: env.PREDICT_OBJECT_ID ?? TESTNET_CONFIG.predictObjectId,
    indexerUrl: env.PREDICT_INDEXER_URL ?? TESTNET_CONFIG.indexerUrl,
    dusdcCoinType: env.DUSDC_COIN_TYPE ?? TESTNET_CONFIG.dusdcCoinType,
  };
}
