import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import type { MarketParams, PredictService } from '../chain/predictService.js';
import type { PredictConfig } from '../config.js';
import { evaluateOracleHealth } from '../health.js';
import type { PredictIndexerClient } from '../indexer/client.js';
import { sizeStake } from './sizing.js';
import {
  positionMarketId,
  type BetReceipt,
  type CashOutReceipt,
  type Position,
  type SettlementEvent,
  type TradingPort,
} from './types.js';

/**
 * Real on-chain funds: balances live in the user's PredictManager, bets are
 * deposit+mint PTBs, cash-outs are owner redeems. Settlement claims are the
 * keeper's job (settle() is a no-op here).
 */
export class RealTradingService implements TradingPort {
  readonly mode = 'real' as const;

  constructor(
    private readonly client: SuiJsonRpcClient,
    private readonly cfg: PredictConfig,
    private readonly predict: PredictService,
    private readonly indexer: PredictIndexerClient,
    private readonly signer: Signer,
    private readonly managerId: string,
  ) {}

  private get address(): string {
    return this.signer.getPublicKey().toSuiAddress();
  }

  private async execute(tx: Transaction) {
    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    if (result.effects?.status.status !== 'success') {
      throw new Error(`transaction failed: ${JSON.stringify(result.effects?.status)}`);
    }
    await this.client.waitForTransaction({ digest: result.digest });
    return result;
  }

  async getBalance(): Promise<bigint> {
    // manager balance plus undeposited wallet dUSDC — both spendable on a bet
    const [manager, wallet] = await Promise.all([
      this.predict.getManagerBalance(this.managerId),
      this.client
        .getBalance({ owner: this.address, coinType: this.cfg.dusdcCoinType })
        .then((b) => BigInt(b.totalBalance)),
    ]);
    return manager + wallet;
  }

  async airdrop(): Promise<void> {
    throw new Error(
      'real-mode airdrops are sent by the ops wallet service, not the user session',
    );
  }

  async placeBet(opts: { market: MarketParams; stakeUnits: bigint }): Promise<BetReceipt> {
    const { market, stakeUnits } = opts;

    const oracleState = await this.indexer.oracleState(market.oracleId);
    const health = evaluateOracleHealth(oracleState);
    if (!health.tradeable) {
      throw new Error(`oracle not tradeable: ${health.reason} — ${health.detail}`);
    }

    const { quantityUnits: quantity, costUnits: mintCost } = await sizeStake(
      this.predict,
      market,
      stakeUnits,
    );

    const managerBalance = await this.predict.getManagerBalance(this.managerId);
    const required = (mintCost * 102n) / 100n; // 2% buffer absorbs ask drift
    const depositUnits = required > managerBalance ? required - managerBalance : 0n;

    const tx =
      depositUnits > 0n
        ? await this.predict.buildDepositTx({
            owner: this.address,
            managerId: this.managerId,
            amountUnits: depositUnits,
            mint: { ...market, quantity },
          })
        : this.predict.buildMintTx({ managerId: this.managerId, market, quantity });

    const result = await this.execute(tx);
    const minted = this.predict.extractPositionMinted(result);
    if (!minted) throw new Error(`mint succeeded but no PositionMinted event (${result.digest})`);

    const position: Position = {
      id: positionMarketId(market),
      market,
      quantityUnits: minted.quantity,
      costUnits: minted.cost,
      askPrice: minted.askPrice,
      placedAt: Date.now(),
      status: 'open',
      txDigest: result.digest,
    };
    return { position, balanceUnits: await this.getBalance(), txDigest: result.digest };
  }

  async cashOut(positionId: string): Promise<CashOutReceipt> {
    const market = parsePositionId(positionId);
    const oracle = (await this.indexer.oracleState(market.oracleId)).oracle;
    market.expiry = BigInt(oracle.expiry);

    const held = await this.predict.getPositionQuantity(this.managerId, market);
    if (held <= 0n) throw new Error(`no on-chain quantity for ${positionId}`);

    const result = await this.execute(
      this.predict.buildRedeemTx({ managerId: this.managerId, market, quantity: held }),
    );
    const redeemed = this.predict.extractPositionRedeemed(result)[0];
    if (!redeemed) throw new Error(`redeem succeeded but no event (${result.digest})`);

    return {
      position: {
        id: positionId,
        market,
        quantityUnits: redeemed.quantity,
        costUnits: 0n, // entry cost tracked in the social DB, not on-chain
        askPrice: 0n,
        placedAt: 0,
        status: 'cashed_out',
        payoutUnits: redeemed.payout,
        settledAt: Date.now(),
        txDigest: result.digest,
      },
      payoutUnits: redeemed.payout,
      balanceUnits: await this.getBalance(),
      txDigest: result.digest,
    };
  }

  async listPositions(): Promise<Position[]> {
    const minted = await this.indexer.positionsMinted({ manager_id: this.managerId, limit: 100 });
    const groups = new Map<string, { market: MarketParams; cost: bigint; quantity: bigint; ask: bigint; at: number }>();
    for (const p of minted) {
      const market: MarketParams = {
        oracleId: p.oracle_id,
        expiry: BigInt(p.expiry),
        strike: BigInt(p.strike),
        isUp: p.is_up,
      };
      const id = positionMarketId(market);
      const prev = groups.get(id);
      groups.set(id, {
        market,
        cost: (prev?.cost ?? 0n) + BigInt(p.cost),
        quantity: (prev?.quantity ?? 0n) + BigInt(p.quantity),
        ask: BigInt(p.ask_price),
        at: Math.max(prev?.at ?? 0, p.checkpoint_timestamp_ms),
      });
    }

    const positions: Position[] = [];
    for (const [id, g] of groups) {
      const held = await this.predict.getPositionQuantity(this.managerId, g.market).catch(() => 0n);
      positions.push({
        id,
        market: g.market,
        quantityUnits: held > 0n ? held : g.quantity,
        costUnits: g.cost,
        askPrice: g.ask,
        placedAt: g.at,
        status: held > 0n ? 'open' : 'cashed_out',
      });
    }
    return positions.sort((a, b) => b.placedAt - a.placedAt);
  }

  /**
   * Detect settlements for the UI — no chain writes (the keeper claims via
   * redeem_permissionless). For every still-held position whose oracle has
   * settled, emit the outcome computed from the real settlement price.
   * Callers must dedupe: events repeat until the keeper's claim zeroes the
   * on-chain quantity.
   */
  async settle(): Promise<SettlementEvent[]> {
    const positions = await this.listPositions();
    const events: SettlementEvent[] = [];
    const oracleCache = new Map<string, { settled: boolean; price: bigint | null }>();

    for (const position of positions) {
      if (position.status !== 'open') continue;
      if (Number(position.market.expiry) > Date.now()) continue;

      let oracle = oracleCache.get(position.market.oracleId);
      if (!oracle) {
        const { oracle: fresh } = await this.indexer.oracleState(position.market.oracleId);
        oracle = {
          settled: fresh.status === 'settled' && fresh.settlement_price != null,
          price: fresh.settlement_price != null ? BigInt(fresh.settlement_price) : null,
        };
        oracleCache.set(position.market.oracleId, oracle);
      }
      if (!oracle.settled || oracle.price == null) continue;

      const won = position.market.isUp
        ? oracle.price > position.market.strike
        : oracle.price <= position.market.strike;
      events.push({
        position: { ...position, status: won ? 'won' : 'lost' },
        settlementPrice: oracle.price,
        won,
        payoutUnits: won ? position.quantityUnits : 0n,
      });
    }
    return events;
  }
}

function parsePositionId(id: string): MarketParams {
  const [oracleId, strike, direction] = id.split(':');
  if (!oracleId || !strike || (direction !== 'up' && direction !== 'down')) {
    throw new Error(`malformed position id: ${id}`);
  }
  return { oracleId, expiry: 0n, strike: BigInt(strike), isUp: direction === 'up' };
}

/** Ops-wallet dUSDC transfer for real-mode airdrops (used by the airdrop API). */
export async function transferDusdc(
  client: SuiJsonRpcClient,
  cfg: PredictConfig,
  opsSigner: Signer,
  recipient: string,
  amountUnits: bigint,
): Promise<string> {
  const owner = opsSigner.getPublicKey().toSuiAddress();
  const coins = await client.getCoins({ owner, coinType: cfg.dusdcCoinType });
  let total = 0n;
  const selected: string[] = [];
  for (const coin of coins.data) {
    selected.push(coin.coinObjectId);
    total += BigInt(coin.balance);
    if (total >= amountUnits) break;
  }
  if (total < amountUnits) {
    throw new Error(`ops wallet holds ${total} units of dUSDC, needs ${amountUnits}`);
  }
  const tx = new Transaction();
  const [primaryId, ...restIds] = selected as [string, ...string[]];
  const primary = tx.object(primaryId);
  if (restIds.length > 0) tx.mergeCoins(primary, restIds.map((id) => tx.object(id)));
  const [payment] = tx.splitCoins(primary, [amountUnits]);
  tx.transferObjects([payment!], recipient);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: opsSigner,
    options: { showEffects: true },
  });
  if (result.effects?.status.status !== 'success') {
    throw new Error(`airdrop transfer failed: ${JSON.stringify(result.effects?.status)}`);
  }
  await client.waitForTransaction({ digest: result.digest });
  return result.digest;
}
