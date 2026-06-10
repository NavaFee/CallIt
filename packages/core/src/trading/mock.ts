import type { MarketParams, PredictService } from '../chain/predictService.js';
import { evaluateOracleHealth } from '../health.js';
import type { PredictIndexerClient } from '../indexer/client.js';
import { sizeStake } from './sizing.js';
import { EMPTY_LEDGER, type LedgerStore, type MockLedgerStateJSON } from './ledgerStore.js';
import {
  positionMarketId,
  type BetReceipt,
  type CashOutReceipt,
  type Position,
  type SettlementEvent,
  type TradingPort,
} from './types.js';

/**
 * Mock funds, real market.
 *
 * Every price this service uses is live protocol truth:
 * - entry cost comes from devInspect on predict::get_trade_amounts (real ask)
 * - cash-out value comes from the same call (real bid)
 * - settlement results are computed from the oracle's real on-chain
 *   settlement_price with the protocol's ITM rule (up wins iff settle > strike)
 * Only custody is simulated: the dUSDC balance and position quantities live
 * in a local ledger instead of a PredictManager. Unset MOCK_FUNDS and the
 * same TradingPort calls hit the chain — no business-code changes.
 */
export class MockTradingService implements TradingPort {
  readonly mode = 'mock' as const;

  constructor(
    private readonly userId: string,
    private readonly store: LedgerStore,
    private readonly predict: PredictService,
    private readonly indexer: PredictIndexerClient,
  ) {}

  private async state(): Promise<MockLedgerStateJSON> {
    return (await this.store.load(this.userId)) ?? structuredClone(EMPTY_LEDGER);
  }

  async getBalance(): Promise<bigint> {
    return BigInt((await this.state()).balanceUnits);
  }

  async airdrop(amountUnits: bigint): Promise<void> {
    const state = await this.state();
    state.balanceUnits = (BigInt(state.balanceUnits) + amountUnits).toString();
    await this.store.save(this.userId, state);
  }

  async placeBet(opts: { market: MarketParams; stakeUnits: bigint }): Promise<BetReceipt> {
    const { market, stakeUnits } = opts;
    if (stakeUnits <= 0n) throw new Error('stake must be positive');

    // identical guard to the real path: refuse bets the protocol would reject
    const oracleState = await this.indexer.oracleState(market.oracleId);
    const health = evaluateOracleHealth(oracleState);
    if (!health.tradeable) {
      throw new Error(`oracle not tradeable: ${health.reason} — ${health.detail}`);
    }

    // real protocol pricing for sizing and cost (cost never exceeds stake)
    const { quantityUnits, costUnits: mintCost, askPrice } = await sizeStake(
      this.predict,
      market,
      stakeUnits,
    );

    const state = await this.state();
    const balance = BigInt(state.balanceUnits);
    if (mintCost > balance) {
      throw new Error(`insufficient mock balance: cost ${mintCost} > balance ${balance}`);
    }

    state.nonce += 1;
    const position: Position = {
      id: `${positionMarketId(market)}:${state.nonce}`,
      market,
      quantityUnits,
      costUnits: mintCost,
      askPrice,
      placedAt: Date.now(),
      status: 'open',
    };
    state.balanceUnits = (balance - mintCost).toString();
    state.positions.push(serializePosition(position));
    await this.store.save(this.userId, state);

    return { position, balanceUnits: balance - mintCost };
  }

  async cashOut(positionId: string): Promise<CashOutReceipt> {
    const state = await this.state();
    const row = state.positions.find((p) => p.id === positionId);
    if (!row || row.status !== 'open') {
      throw new Error(`no open position ${positionId}`);
    }
    const position = deserializePosition(row);

    // real bid-side quote for the early exit
    const { redeemPayout } = await this.predict.getTradeAmounts(
      position.market,
      position.quantityUnits,
    );

    row.status = 'cashed_out';
    row.payoutUnits = redeemPayout.toString();
    row.settledAt = Date.now();
    const balance = BigInt(state.balanceUnits) + redeemPayout;
    state.balanceUnits = balance.toString();
    await this.store.save(this.userId, state);

    return {
      position: deserializePosition(row),
      payoutUnits: redeemPayout,
      balanceUnits: balance,
    };
  }

  async listPositions(): Promise<Position[]> {
    const state = await this.state();
    return state.positions.map(deserializePosition).sort((a, b) => b.placedAt - a.placedAt);
  }

  async settle(): Promise<SettlementEvent[]> {
    const state = await this.state();
    const open = state.positions.filter((p) => p.status === 'open');
    if (open.length === 0) return [];

    const events: SettlementEvent[] = [];
    const oracleCache = new Map<string, { settled: boolean; price: bigint | null }>();

    for (const row of open) {
      let oracle = oracleCache.get(row.oracleId);
      if (!oracle) {
        const { oracle: fresh } = await this.indexer.oracleState(row.oracleId);
        oracle = {
          settled: fresh.status === 'settled' && fresh.settlement_price != null,
          price: fresh.settlement_price != null ? BigInt(fresh.settlement_price) : null,
        };
        oracleCache.set(row.oracleId, oracle);
      }
      if (!oracle.settled || oracle.price == null) continue;

      // protocol ITM rule: up pays iff settlement > strike, down iff ≤ strike
      const strike = BigInt(row.strike);
      const won = row.isUp ? oracle.price > strike : oracle.price <= strike;
      const payout = won ? BigInt(row.quantityUnits) : 0n;

      row.status = won ? 'won' : 'lost';
      row.payoutUnits = payout.toString();
      row.settledAt = Date.now();
      state.balanceUnits = (BigInt(state.balanceUnits) + payout).toString();

      events.push({
        position: deserializePosition(row),
        settlementPrice: oracle.price,
        won,
        payoutUnits: payout,
      });
    }

    if (events.length > 0) await this.store.save(this.userId, state);
    return events;
  }
}

function serializePosition(p: Position): MockLedgerStateJSON['positions'][number] {
  return {
    id: p.id,
    oracleId: p.market.oracleId,
    expiry: p.market.expiry.toString(),
    strike: p.market.strike.toString(),
    isUp: p.market.isUp,
    quantityUnits: p.quantityUnits.toString(),
    costUnits: p.costUnits.toString(),
    askPrice: p.askPrice.toString(),
    placedAt: p.placedAt,
    status: p.status,
    payoutUnits: p.payoutUnits?.toString(),
    settledAt: p.settledAt,
  };
}

function deserializePosition(row: MockLedgerStateJSON['positions'][number]): Position {
  return {
    id: row.id,
    market: {
      oracleId: row.oracleId,
      expiry: BigInt(row.expiry),
      strike: BigInt(row.strike),
      isUp: row.isUp,
    },
    quantityUnits: BigInt(row.quantityUnits),
    costUnits: BigInt(row.costUnits),
    askPrice: BigInt(row.askPrice),
    placedAt: row.placedAt,
    status: row.status,
    payoutUnits: row.payoutUnits !== undefined ? BigInt(row.payoutUnits) : undefined,
    settledAt: row.settledAt,
  };
}
