/**
 * Live-chain integration test: real mint → on-chain position read → real redeem
 * against DeepBook Predict on Sui testnet.
 *
 * Opt-in because it spends real testnet funds and needs a funded wallet:
 *   RUN_CHAIN_TESTS=1 PRIVATE_KEY=suiprivkey1... pnpm test
 * The wallet needs ~0.05 SUI for gas and ~2 dUSDC.
 * In CI both come from repository secrets.
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { evaluateOracleHealth } from '../src/health.js';
import { PredictIndexerClient } from '../src/indexer/client.js';
import { PredictService, type MarketParams } from '../src/chain/predictService.js';
import { nearestStrike, usdToFixed } from '../src/units.js';

const enabled = process.env.RUN_CHAIN_TESTS === '1';

describe.runIf(enabled)('testnet round trip', () => {
  const cfg = loadConfig();
  const client = new SuiJsonRpcClient({
    url: cfg.rpcUrl ?? getJsonRpcFullnodeUrl('testnet'),
    network: 'testnet',
  });
  const indexer = new PredictIndexerClient(cfg.indexerUrl);
  const service = new PredictService(client, cfg);

  let keypair: Ed25519Keypair;
  let address: string;
  let managerId: string;
  let market: MarketParams;

  const QUANTITY = 1_000_000n; // 1 dUSDC notional keeps spend tiny

  async function execute(tx: Parameters<typeof client.signAndExecuteTransaction>[0]['transaction']) {
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    expect(result.effects?.status.status, JSON.stringify(result.effects?.status)).toBe('success');
    await client.waitForTransaction({ digest: result.digest });
    return result;
  }

  beforeAll(async () => {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error('RUN_CHAIN_TESTS=1 requires PRIVATE_KEY');
    keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(pk).secretKey);
    address = keypair.getPublicKey().toSuiAddress();

    // pick the soonest active, tradeable oracle and its ATM strike
    const active = await indexer.activeOracles(cfg.predictObjectId);
    expect(active.length).toBeGreaterThan(0);
    const oracle = active[0]!;
    const state = await indexer.oracleState(oracle.oracle_id);
    const health = evaluateOracleHealth(state);
    if (!health.tradeable) throw new Error(`oracle not tradeable: ${JSON.stringify(health)}`);
    market = {
      oracleId: oracle.oracle_id,
      expiry: BigInt(oracle.expiry),
      strike: nearestStrike(
        usdToFixed(health.spotUsd),
        BigInt(oracle.min_strike),
        BigInt(oracle.tick_size),
      ),
      isUp: true,
    };

    // reuse an existing manager or create one
    const mine = (await indexer.managers({ owner: address }).catch(() => []))
      .find((m) => m.owner === address);
    if (mine) {
      managerId = mine.manager_id;
    } else {
      const result = await execute(service.buildCreateManagerTx());
      const created = service.extractManagerId(result);
      if (!created) throw new Error('manager not found in objectChanges');
      managerId = created;
    }
  }, 120_000);

  it('quotes a sane two-sided market', async () => {
    const { mintCost, redeemPayout } = await service.getTradeAmounts(market, QUANTITY);
    // binary ask must be within protocol bounds (1%–99% of notional)
    expect(mintCost).toBeGreaterThan(QUANTITY / 100n);
    expect(mintCost).toBeLessThan(QUANTITY);
    // immediate cash-out (bid) returns less than mint cost (the spread)
    expect(redeemPayout).toBeGreaterThan(0n);
    expect(redeemPayout).toBeLessThanOrEqual(mintCost);
  });

  it('mints, holds, and redeems a position on-chain', async () => {
    const before = await service.getPositionQuantity(managerId, market);
    const balance = await service.getManagerBalance(managerId);
    const { mintCost } = await service.getTradeAmounts(market, QUANTITY);

    const required = (mintCost * 102n) / 100n;
    const depositUnits = required > balance ? required - balance : 0n;
    const tx =
      depositUnits > 0n
        ? await service.buildDepositTx({
            owner: address,
            managerId,
            amountUnits: depositUnits,
            mint: { ...market, quantity: QUANTITY },
          })
        : service.buildMintTx({ managerId, market, quantity: QUANTITY });
    const mintResult = await execute(tx);

    const minted = service.extractPositionMinted(mintResult);
    expect(minted).not.toBeNull();
    expect(minted!.quantity).toBe(QUANTITY);
    expect(minted!.cost).toBeGreaterThan(0n);

    const held = await service.getPositionQuantity(managerId, market);
    expect(held - before).toBe(QUANTITY);

    const redeemResult = await execute(
      service.buildRedeemTx({ managerId, market, quantity: QUANTITY }),
    );
    const redeemed = service.extractPositionRedeemed(redeemResult);
    expect(redeemed).toHaveLength(1);
    expect(redeemed[0]!.payout).toBeGreaterThan(0n);
    expect(redeemed[0]!.isSettled).toBe(false);

    const after = await service.getPositionQuantity(managerId, market);
    expect(after).toBe(before);
  }, 120_000);
});

describe.runIf(!enabled)('testnet round trip (skipped)', () => {
  it('is opt-in via RUN_CHAIN_TESTS=1', () => {
    expect(enabled).toBe(false);
  });
});
