import { describe, expect, it } from 'vitest';
import type { Signer } from '@mysten/sui/cryptography';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { TESTNET_CONFIG } from '../src/config.js';
import type { PredictService } from '../src/chain/predictService.js';
import type { PredictIndexerClient } from '../src/indexer/client.js';
import { RealTradingService } from '../src/trading/real.js';

/**
 * Real-mode settlement DETECTION: settle() computes outcomes from the real
 * settlement price without chain writes (claims belong to the keeper).
 * This drives the in-app celebration when MOCK_FUNDS is off.
 */

const NOW = Date.now();
const EXPIRED = NOW - 60_000;
const STRIKE = 62_000_000_000_000n; // $62,000

function makeService(opts: {
  heldUnits: bigint;
  oracleStatus: 'active' | 'settled';
  settlementPrice: bigint | null;
  expiryMs?: number;
  isUp?: boolean;
}) {
  const expiry = opts.expiryMs ?? EXPIRED;
  const indexer = {
    async positionsMinted() {
      return [
        {
          event_digest: 'e', digest: 'd', sender: '0xs', checkpoint: 1,
          checkpoint_timestamp_ms: NOW - 900_000, package: '0xpkg',
          predict_id: '0xpredict', manager_id: '0xmanager', trader: '0xtrader',
          quote_asset: 'dusdc', oracle_id: '0xoracle',
          expiry: expiry.toString(), strike: STRIKE.toString(),
          is_up: opts.isUp ?? true,
          quantity: '20000000', cost: '10000000', ask_price: '500000000',
        },
      ];
    },
    async oracleState() {
      return {
        oracle: {
          predict_id: '0xpredict', oracle_id: '0xoracle', oracle_cap_id: '0xcap',
          underlying_asset: 'BTC', expiry: expiry.toString(),
          min_strike: '50000000000000', tick_size: '1000000000',
          status: opts.oracleStatus, activated_at: null,
          settlement_price: opts.settlementPrice?.toString() ?? null, settled_at: null,
        },
        latest_price: null, latest_svi: null, ask_bounds: null,
      };
    },
  } as unknown as PredictIndexerClient;

  const predict = {
    async getPositionQuantity() {
      return opts.heldUnits;
    },
  } as unknown as PredictService;

  return new RealTradingService(
    {} as SuiJsonRpcClient, TESTNET_CONFIG, predict, indexer, {} as Signer, '0xmanager',
  );
}

describe('real-mode settlement detection', () => {
  it('emits a won event with full-notional payout when settle > strike (UP)', async () => {
    const svc = makeService({
      heldUnits: 20_000_000n,
      oracleStatus: 'settled',
      settlementPrice: STRIKE + 500_000_000_000n,
    });
    const events = await svc.settle();
    expect(events).toHaveLength(1);
    expect(events[0]!.won).toBe(true);
    expect(events[0]!.payoutUnits).toBe(20_000_000n);
    expect(events[0]!.position.status).toBe('won');
  });

  it('emits a lost event with zero payout when settle ≤ strike (UP)', async () => {
    const svc = makeService({
      heldUnits: 20_000_000n,
      oracleStatus: 'settled',
      settlementPrice: STRIKE, // at the strike: UP loses
    });
    const events = await svc.settle();
    expect(events[0]!.won).toBe(false);
    expect(events[0]!.payoutUnits).toBe(0n);
    expect(events[0]!.position.status).toBe('lost');
  });

  it('stays silent while the oracle has not settled', async () => {
    const svc = makeService({
      heldUnits: 20_000_000n,
      oracleStatus: 'active',
      settlementPrice: null,
    });
    expect(await svc.settle()).toHaveLength(0);
  });

  it('stays silent for positions the keeper already claimed (held = 0)', async () => {
    const svc = makeService({
      heldUnits: 0n,
      oracleStatus: 'settled',
      settlementPrice: STRIKE + 1_000_000_000n,
    });
    expect(await svc.settle()).toHaveLength(0);
  });

  it('ignores unexpired positions even if asked', async () => {
    const svc = makeService({
      heldUnits: 20_000_000n,
      oracleStatus: 'active',
      settlementPrice: null,
      expiryMs: NOW + 600_000,
    });
    expect(await svc.settle()).toHaveLength(0);
  });
});
