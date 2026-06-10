/**
 * CallIt keeper — minimal version (milestone 2).
 *
 * Watches active oracles for settlement and claims payouts for users via
 * predict::redeem_permissionless, so winnings land in their PredictManagers
 * with zero user action.
 *
 * Current transport is light polling of /oracles/:id/state (15s near expiry,
 * 60s otherwise). TODO(milestone 6): switch the hot path to a Sui event
 * subscription on oracle::OracleSettled with this poller as fallback, per the
 * integration model in the protocol README.
 *
 * Run: PRIVATE_KEY=suiprivkey1... pnpm --filter @callit/worker dev
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  OracleCache,
  PredictIndexerClient,
  PredictService,
  loadConfig,
  unitsToDusdc,
  type MarketParams,
  type OracleRow,
} from '@callit/core';

const POLL_FAR_MS = 60_000;
const POLL_NEAR_MS = 15_000;
const NEAR_EXPIRY_WINDOW_MS = 10 * 60_000;
const ORACLE_LIST_REFRESH_MS = 10 * 60_000;
/** redeem calls per PTB — stays well under move-call and gas limits */
const BATCH_SIZE = 15;

const cfg = loadConfig();
const client = new SuiJsonRpcClient({
  url: cfg.rpcUrl ?? getJsonRpcFullnodeUrl('testnet'),
  network: cfg.network,
});
const indexer = new PredictIndexerClient(cfg.indexerUrl);
const oracleCache = new OracleCache(indexer, cfg.predictObjectId, {
  ttlMs: ORACLE_LIST_REFRESH_MS,
  cacheFile: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../.cache/oracles.json',
  ),
});
const service = new PredictService(client, cfg);

function keeperKeypair(): Ed25519Keypair {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('keeper needs PRIVATE_KEY (funds gas for permissionless redeems)');
  return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(pk).secretKey);
}

const log = (msg: string) => console.log(`${new Date().toISOString()} ${msg}`);

/** Oracles we've fully processed (settled + payouts claimed). */
const done = new Set<string>();

async function claimSettledPositions(oracle: OracleRow): Promise<void> {
  // every mint against this oracle; on-chain quantity is the claim authority
  const minted = await indexer.positionsMinted({ oracle_id: oracle.oracle_id, limit: 1000 });
  const groups = new Map<string, { managerId: string; market: MarketParams }>();
  for (const p of minted) {
    const key = `${p.manager_id}:${p.strike}:${p.is_up}`;
    groups.set(key, {
      managerId: p.manager_id,
      market: {
        oracleId: p.oracle_id,
        expiry: BigInt(p.expiry),
        strike: BigInt(p.strike),
        isUp: p.is_up,
      },
    });
  }
  log(`oracle ${oracle.oracle_id.slice(0, 10)}… settled — ${groups.size} position group(s) to check`);

  const claimable: Array<{ managerId: string; market: MarketParams; quantity: bigint }> = [];
  for (const { managerId, market } of groups.values()) {
    try {
      const held = await service.getPositionQuantity(managerId, market);
      if (held > 0n) claimable.push({ managerId, market, quantity: held });
    } catch (err) {
      log(`  position read failed for ${managerId.slice(0, 10)}…: ${err}`);
    }
  }
  if (claimable.length === 0) {
    log('  nothing unclaimed');
    return;
  }

  const keypair = keeperKeypair();
  for (let i = 0; i < claimable.length; i += BATCH_SIZE) {
    const batch = claimable.slice(i, i + BATCH_SIZE);
    const tx = service.buildRedeemPermissionlessTx(batch);
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true, showEvents: true },
    });
    if (result.effects?.status.status !== 'success') {
      log(`  ✗ batch failed: ${JSON.stringify(result.effects?.status)}`);
      continue;
    }
    await client.waitForTransaction({ digest: result.digest });
    for (const r of service.extractPositionRedeemed(result)) {
      log(
        `  ✓ paid ${unitsToDusdc(r.payout).toFixed(2)} dUSDC to manager ${r.managerId.slice(0, 10)}… (tx ${result.digest})`,
      );
      // TODO(milestone 5): settlement DM via the notify bot + streak update
    }
  }
}

async function tick(tracked: OracleRow[]): Promise<void> {
  for (const oracle of tracked) {
    if (done.has(oracle.oracle_id)) continue;
    try {
      const { oracle: fresh } = await indexer.oracleState(oracle.oracle_id);
      if (fresh.status === 'settled') {
        await claimSettledPositions(fresh);
        done.add(oracle.oracle_id);
      }
    } catch (err) {
      log(`state poll failed for ${oracle.oracle_id.slice(0, 10)}…: ${err}`);
    }
  }
}

async function main(): Promise<void> {
  log(`keeper starting — predict ${cfg.predictObjectId.slice(0, 10)}… on ${cfg.network}`);
  for (;;) {
    let tracked: OracleRow[] = [];
    try {
      // include recently-expired oracles still awaiting their settlement print
      const { rows } = await oracleCache.getAll();
      tracked = rows.filter(
        (o) => o.status === 'active' || (o.status !== 'settled' && !done.has(o.oracle_id)),
      );
    } catch (err) {
      log(`oracle list fetch failed: ${err}`);
    }
    await tick(tracked);

    const now = Date.now();
    const nearExpiry = tracked.some(
      (o) => Math.abs(Number(o.expiry) - now) < NEAR_EXPIRY_WINDOW_MS,
    );
    await new Promise((resolve) => setTimeout(resolve, nearExpiry ? POLL_NEAR_MS : POLL_FAR_MS));
  }
}

main().catch((err) => {
  console.error('keeper crashed:', err);
  process.exit(1);
});
