import { describe, expect, it } from 'vitest';
import type { MarketParams, PredictService } from '../src/chain/predictService.js';
import type { PredictIndexerClient } from '../src/indexer/client.js';
import type { OracleStateResponse } from '../src/indexer/types.js';
import { MemoryLedgerStore } from '../src/trading/ledgerStore.js';
import { MockTradingService } from '../src/trading/mock.js';

const NOW = Date.now();

const MARKET: MarketParams = {
  oracleId: '0xoracle',
  expiry: BigInt(NOW + 86_400_000),
  strike: 61_352_000_000_000n, // $61,352
  isUp: true,
};

/** ask 0.50 / bid 0.45, scaled per requested quantity */
function stubPredict(): PredictService {
  return {
    async getTradeAmounts(_market: MarketParams, quantity: bigint) {
      return { mintCost: quantity / 2n, redeemPayout: (quantity * 45n) / 100n };
    },
  } as unknown as PredictService;
}

function stubIndexer(opts: { status?: string; settlementPrice?: bigint; stale?: boolean }): PredictIndexerClient {
  const state: OracleStateResponse = {
    oracle: {
      predict_id: '0xpredict',
      oracle_id: '0xoracle',
      oracle_cap_id: '0xcap',
      underlying_asset: 'BTC',
      expiry: (NOW + 86_400_000).toString(),
      min_strike: '50000000000000',
      tick_size: '1000000000',
      status: (opts.status ?? 'active') as 'active',
      activated_at: NOW.toString(),
      settlement_price: opts.settlementPrice?.toString() ?? null,
      settled_at: null,
    },
    latest_price: {
      event_digest: 'e', digest: 'd', sender: '0xf', checkpoint: 1,
      checkpoint_timestamp_ms: NOW, package: '0xpkg',
      oracle_id: '0xoracle',
      spot: '61351520000000',
      forward: '61346167000000',
      onchain_timestamp: opts.stale ? NOW - 60_000 : NOW - 5_000,
    },
    latest_svi: {
      event_digest: 'e', digest: 'd', sender: '0xf', checkpoint: 1,
      checkpoint_timestamp_ms: NOW, package: '0xpkg',
      oracle_id: '0xoracle',
      a: '1', b: '1', rho: '1', rho_negative: false, m: '1', m_negative: false, sigma: '1',
      onchain_timestamp: opts.stale ? NOW - 60_000 : NOW - 5_000,
    },
    ask_bounds: null,
  };
  return { async oracleState() { return state; } } as unknown as PredictIndexerClient;
}

function makeService(indexer = stubIndexer({})) {
  return new MockTradingService('user-1', new MemoryLedgerStore(), stubPredict(), indexer);
}

describe('mock trading service', () => {
  it('credits airdrops', async () => {
    const svc = makeService();
    await svc.airdrop(100_000_000n);
    expect(await svc.getBalance()).toBe(100_000_000n);
  });

  it('places a bet at the real ask and debits cost', async () => {
    const svc = makeService();
    await svc.airdrop(100_000_000n);
    const receipt = await svc.placeBet({ market: MARKET, stakeUnits: 10_000_000n });
    // ask 0.5 → 10 dUSDC premium buys 20 dUSDC notional at cost 10
    expect(receipt.position.quantityUnits).toBe(20_000_000n);
    expect(receipt.position.costUnits).toBe(10_000_000n);
    expect(receipt.balanceUnits).toBe(90_000_000n);
    expect(receipt.position.status).toBe('open');
  });

  it('rejects bets above balance', async () => {
    const svc = makeService();
    await svc.airdrop(1_000_000n);
    await expect(svc.placeBet({ market: MARKET, stakeUnits: 10_000_000n })).rejects.toThrow(
      /insufficient mock balance/,
    );
  });

  it('refuses to bet when the oracle health fuse trips', async () => {
    const svc = makeService(stubIndexer({ stale: true }));
    await svc.airdrop(100_000_000n);
    await expect(svc.placeBet({ market: MARKET, stakeUnits: 10_000_000n })).rejects.toThrow(
      /not tradeable/,
    );
  });

  it('cashes out at the real bid', async () => {
    const svc = makeService();
    await svc.airdrop(100_000_000n);
    const { position } = await svc.placeBet({ market: MARKET, stakeUnits: 10_000_000n });
    const receipt = await svc.cashOut(position.id);
    // bid 0.45 on 20 notional → 9 dUSDC back
    expect(receipt.payoutUnits).toBe(9_000_000n);
    expect(receipt.balanceUnits).toBe(99_000_000n);
    expect(receipt.position.status).toBe('cashed_out');
  });

  it('settles a winning UP call at the real settlement price', async () => {
    const store = new MemoryLedgerStore();
    const active = new MockTradingService('u', store, stubPredict(), stubIndexer({}));
    await active.airdrop(100_000_000n);
    const { position } = await active.placeBet({ market: MARKET, stakeUnits: 10_000_000n });

    // oracle settles above the strike
    const settled = new MockTradingService(
      'u', store, stubPredict(),
      stubIndexer({ status: 'settled', settlementPrice: 61_400_000_000_000n }),
    );
    const events = await settled.settle();
    expect(events).toHaveLength(1);
    expect(events[0]!.won).toBe(true);
    expect(events[0]!.payoutUnits).toBe(position.quantityUnits);
    expect(await settled.getBalance()).toBe(90_000_000n + position.quantityUnits);
    const positions = await settled.listPositions();
    expect(positions[0]!.status).toBe('won');
  });

  it('settles a losing UP call to zero (settlement at the strike loses)', async () => {
    const store = new MemoryLedgerStore();
    const active = new MockTradingService('u', store, stubPredict(), stubIndexer({}));
    await active.airdrop(100_000_000n);
    await active.placeBet({ market: MARKET, stakeUnits: 10_000_000n });

    const settled = new MockTradingService(
      'u', store, stubPredict(),
      stubIndexer({ status: 'settled', settlementPrice: MARKET.strike }), // exactly at strike
    );
    const events = await settled.settle();
    expect(events[0]!.won).toBe(false);
    expect(events[0]!.payoutUnits).toBe(0n);
    expect(await settled.getBalance()).toBe(90_000_000n);
    expect((await settled.listPositions())[0]!.status).toBe('lost');
  });

  it('settles a DOWN call as the mirror of UP', async () => {
    const store = new MemoryLedgerStore();
    const active = new MockTradingService('u', store, stubPredict(), stubIndexer({}));
    await active.airdrop(100_000_000n);
    await active.placeBet({
      market: { ...MARKET, isUp: false },
      stakeUnits: 10_000_000n,
    });
    const settled = new MockTradingService(
      'u', store, stubPredict(),
      stubIndexer({ status: 'settled', settlementPrice: MARKET.strike }), // at strike → down wins
    );
    const events = await settled.settle();
    expect(events[0]!.won).toBe(true);
  });

  it('does not settle while the oracle is active', async () => {
    const svc = makeService();
    await svc.airdrop(100_000_000n);
    await svc.placeBet({ market: MARKET, stakeUnits: 10_000_000n });
    expect(await svc.settle()).toHaveLength(0);
    expect((await svc.listPositions())[0]!.status).toBe('open');
  });
});
