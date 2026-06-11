import { bcs } from '@mysten/sui/bcs';
import type { SuiJsonRpcClient, SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { PredictConfig } from '../config.js';
import * as marketKey from '../generated/deepbook_predict/market_key.js';
import * as predict from '../generated/deepbook_predict/predict.js';
import * as predictManager from '../generated/deepbook_predict/predict_manager.js';

/** Identifies one binary market: (oracle, expiry, strike, direction). */
export interface MarketParams {
  oracleId: string;
  /** expiry timestamp in ms; must equal the oracle's expiry */
  expiry: bigint;
  /** strike in 1e9 fixed-point, on the oracle's grid */
  strike: bigint;
  isUp: boolean;
}

export interface TradeAmounts {
  /** cost in quote units to mint `quantity` of notional */
  mintCost: bigint;
  /** quote units received for redeeming `quantity` right now */
  redeemPayout: bigint;
}

export interface PositionMintedEvent {
  managerId: string;
  trader: string;
  oracleId: string;
  expiry: bigint;
  strike: bigint;
  isUp: boolean;
  quantity: bigint;
  cost: bigint;
  askPrice: bigint;
}

export interface PositionRedeemedEvent {
  managerId: string;
  owner: string;
  executor: string;
  oracleId: string;
  quantity: bigint;
  payout: bigint;
  bidPrice: bigint;
  isSettled: boolean;
}

const DEV_INSPECT_SENDER = normalizeSuiAddress('0x0');

/**
 * Builds DeepBook Predict transactions and performs confirmation-critical
 * chain reads. Pure transaction building is synchronous; methods that need
 * coin selection or devInspect take the RPC client.
 *
 * Note on the first-bet flow: `predict_manager::new` shares the manager
 * inside Move and only returns its ID, so a brand-new manager cannot be
 * referenced again within the same PTB. Account creation is therefore its
 * own transaction (done at signup/airdrop time) and `deposit + mint`
 * compose into the single PTB a user signs per bet.
 */
export class PredictService {
  constructor(
    private readonly client: SuiJsonRpcClient,
    readonly cfg: PredictConfig,
  ) {}

  // ── transaction builders ────────────────────────────────────────────

  buildCreateManagerTx(): Transaction {
    const tx = new Transaction();
    tx.add(predict.createManager());
    return tx;
  }

  /**
   * Deposit `amountUnits` of dUSDC into the manager, selecting and merging
   * the owner's coins as needed, optionally followed by a mint in the same PTB.
   */
  async buildDepositTx(opts: {
    owner: string;
    managerId: string;
    amountUnits: bigint;
    /** when set, mint this market in the same PTB after the deposit */
    mint?: MarketParams & { quantity: bigint };
  }): Promise<Transaction> {
    const tx = new Transaction();
    const payment = await this.selectDusdc(tx, opts.owner, opts.amountUnits);
    tx.add(
      predictManager.deposit({
        arguments: [tx.object(opts.managerId), payment],
        typeArguments: [this.cfg.dusdcCoinType],
      }),
    );
    if (opts.mint) {
      this.addMint(tx, opts.managerId, opts.mint, opts.mint.quantity);
    }
    return tx;
  }

  /** Mint against an already-funded manager. */
  buildMintTx(opts: { managerId: string; market: MarketParams; quantity: bigint }): Transaction {
    const tx = new Transaction();
    this.addMint(tx, opts.managerId, opts.market, opts.quantity);
    return tx;
  }

  /** Owner redeem — early cash-out before settlement, or claim after. */
  buildRedeemTx(opts: { managerId: string; market: MarketParams; quantity: bigint }): Transaction {
    const tx = new Transaction();
    const key = this.addMarketKey(tx, opts.market);
    tx.add(
      predict.redeem({
        arguments: [
          tx.object(this.cfg.predictObjectId),
          tx.object(opts.managerId),
          tx.object(opts.market.oracleId),
          key,
          opts.quantity,
        ],
        typeArguments: [this.cfg.dusdcCoinType],
      }),
    );
    return tx;
  }

  /**
   * Keeper redeem for settled oracles: anyone may execute, payout lands in
   * the position owner's manager. Multiple positions batch into one PTB.
   */
  buildRedeemPermissionlessTx(
    items: Array<{ managerId: string; market: MarketParams; quantity: bigint }>,
  ): Transaction {
    const tx = new Transaction();
    for (const item of items) {
      const key = this.addMarketKey(tx, item.market);
      tx.add(
        predict.redeemPermissionless({
          arguments: [
            tx.object(this.cfg.predictObjectId),
            tx.object(item.managerId),
            tx.object(item.market.oracleId),
            key,
            item.quantity,
          ],
          typeArguments: [this.cfg.dusdcCoinType],
        }),
      );
    }
    return tx;
  }

  /**
   * Withdraw free quote balance from the manager back to the owner's wallet.
   * Owner-only on-chain; the withdrawn Coin is transferred to `recipient`
   * (defaults to the manager owner via tx sender).
   */
  buildManagerWithdrawTx(opts: { managerId: string; amountUnits: bigint; recipient: string }): Transaction {
    const tx = new Transaction();
    const coin = tx.add(
      predictManager.withdraw({
        arguments: [tx.object(opts.managerId), opts.amountUnits],
        typeArguments: [this.cfg.dusdcCoinType],
      }),
    );
    tx.transferObjects([coin], opts.recipient);
    return tx;
  }

  private addMarketKey(tx: Transaction, market: MarketParams) {
    return tx.add(
      marketKey._new({
        arguments: [market.oracleId, market.expiry, market.strike, market.isUp],
      }),
    );
  }

  private addMint(tx: Transaction, managerId: string, market: MarketParams, quantity: bigint) {
    const key = this.addMarketKey(tx, market);
    tx.add(
      predict.mint({
        arguments: [
          tx.object(this.cfg.predictObjectId),
          tx.object(managerId),
          tx.object(market.oracleId),
          key,
          quantity,
        ],
        typeArguments: [this.cfg.dusdcCoinType],
      }),
    );
  }

  /** Select dUSDC coins covering `amount`, merging into one and splitting exact. */
  private async selectDusdc(tx: Transaction, owner: string, amount: bigint) {
    const coins = await this.client.getCoins({ owner, coinType: this.cfg.dusdcCoinType });
    let total = 0n;
    const selected: string[] = [];
    for (const coin of coins.data) {
      selected.push(coin.coinObjectId);
      total += BigInt(coin.balance);
      if (total >= amount) break;
    }
    if (total < amount) {
      throw new Error(
        `insufficient dUSDC: need ${amount} units, wallet ${owner} holds ${total}`,
      );
    }
    const [primaryId, ...restIds] = selected as [string, ...string[]];
    const primary = tx.object(primaryId);
    if (restIds.length > 0) {
      tx.mergeCoins(
        primary,
        restIds.map((id) => tx.object(id)),
      );
    }
    const [payment] = tx.splitCoins(primary, [amount]);
    return payment!;
  }

  // ── reads (devInspect: authoritative, pre/post-trade) ──────────────

  /** Protocol-priced preview via predict::get_trade_amounts (per total quantity). */
  async getTradeAmounts(market: MarketParams, quantity: bigint): Promise<TradeAmounts> {
    const tx = new Transaction();
    const key = this.addMarketKey(tx, market);
    tx.add(
      predict.getTradeAmounts({
        arguments: [
          tx.object(this.cfg.predictObjectId),
          tx.object(market.oracleId),
          key,
          quantity,
        ],
      }),
    );
    const values = await this.devInspectU64s(tx, 1);
    const [mintCost, redeemPayout] = values as [bigint, bigint];
    return { mintCost, redeemPayout };
  }

  /** Manager's free dUSDC balance, read on-chain. */
  async getManagerBalance(managerId: string): Promise<bigint> {
    const tx = new Transaction();
    tx.add(
      predictManager.balance({
        arguments: [tx.object(managerId)],
        typeArguments: [this.cfg.dusdcCoinType],
      }),
    );
    const [balance] = await this.devInspectU64s(tx, 0);
    return balance!;
  }

  /** Quantity held for one market key, read on-chain. */
  async getPositionQuantity(managerId: string, market: MarketParams): Promise<bigint> {
    const tx = new Transaction();
    const key = this.addMarketKey(tx, market);
    tx.add(
      predictManager.position({
        arguments: [tx.object(managerId), key],
      }),
    );
    const [quantity] = await this.devInspectU64s(tx, 1);
    return quantity!;
  }

  /** Run a tx via devInspect and decode all u64 return values of command `commandIndex`. */
  private async devInspectU64s(tx: Transaction, commandIndex: number): Promise<bigint[]> {
    const res = await this.client.devInspectTransactionBlock({
      sender: DEV_INSPECT_SENDER,
      transactionBlock: tx,
    });
    if (res.error) {
      throw new Error(`devInspect failed: ${res.error}`);
    }
    const returnValues = res.results?.[commandIndex]?.returnValues ?? [];
    return returnValues.map(([bytes]) => BigInt(bcs.u64().parse(Uint8Array.from(bytes))));
  }

  // ── result parsing ──────────────────────────────────────────────────

  /** Manager id created by a create_manager transaction. */
  extractManagerId(result: SuiTransactionBlockResponse): string | null {
    for (const change of result.objectChanges ?? []) {
      if (change.type === 'created' && change.objectType.endsWith('::predict_manager::PredictManager')) {
        return change.objectId;
      }
    }
    return null;
  }

  extractPositionMinted(result: SuiTransactionBlockResponse): PositionMintedEvent | null {
    const event = (result.events ?? []).find((e) =>
      e.type.endsWith('::predict::PositionMinted'),
    );
    if (!event) return null;
    const p = event.parsedJson as Record<string, unknown>;
    return {
      managerId: String(p.manager_id),
      trader: String(p.trader),
      oracleId: String(p.oracle_id),
      expiry: BigInt(p.expiry as string),
      strike: BigInt(p.strike as string),
      isUp: Boolean(p.is_up),
      quantity: BigInt(p.quantity as string),
      cost: BigInt(p.cost as string),
      askPrice: BigInt(p.ask_price as string),
    };
  }

  extractPositionRedeemed(result: SuiTransactionBlockResponse): PositionRedeemedEvent[] {
    return (result.events ?? [])
      .filter((e) => e.type.endsWith('::predict::PositionRedeemed'))
      .map((event) => {
        const p = event.parsedJson as Record<string, unknown>;
        return {
          managerId: String(p.manager_id),
          owner: String(p.owner),
          executor: String(p.executor),
          oracleId: String(p.oracle_id),
          quantity: BigInt(p.quantity as string),
          payout: BigInt(p.payout as string),
          bidPrice: BigInt(p.bid_price as string),
          isSettled: Boolean(p.is_settled),
        };
      });
  }
}
