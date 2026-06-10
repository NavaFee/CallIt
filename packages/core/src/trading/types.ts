import type { MarketParams } from '../chain/predictService.js';

/**
 * TradingPort abstracts the funds write-path so the app runs identically
 * with real on-chain funds or a mock ledger (MOCK_FUNDS=1) while dUSDC
 * distribution is pending.
 *
 * Read paths (prices, oracle list, quotes) are NOT behind this interface —
 * they always hit the real chain/indexer. Only custody of funds is swapped.
 */
export interface TradingPort {
  readonly mode: 'real' | 'mock';
  /** Free quote balance available for betting, in 1e6 units. */
  getBalance(): Promise<bigint>;
  /** Credit the account: mock ledger credit, or ops-wallet dUSDC transfer. */
  airdrop(amountUnits: bigint): Promise<void>;
  /** Spend up to `stakeUnits` of premium on a market at the live protocol ask. */
  placeBet(opts: { market: MarketParams; stakeUnits: bigint }): Promise<BetReceipt>;
  /** Early redeem the full quantity of an open position at the live bid. */
  cashOut(positionId: string): Promise<CashOutReceipt>;
  listPositions(): Promise<Position[]>;
  /**
   * Apply oracle settlements to open positions (mock mode only — on the real
   * path the keeper's redeem_permissionless does this). Returns what changed.
   */
  settle(): Promise<SettlementEvent[]>;
}

export interface Position {
  /** stable id: `${oracleId}:${strike}:${direction}` (+ `:n` nonce in mock mode) */
  id: string;
  market: MarketParams;
  /** settlement notional, 1e6 units */
  quantityUnits: bigint;
  /** premium paid, 1e6 units */
  costUnits: bigint;
  /** entry ask, 1e9 fixed-point */
  askPrice: bigint;
  placedAt: number;
  status: 'open' | 'cashed_out' | 'won' | 'lost';
  payoutUnits?: bigint;
  settledAt?: number;
  /** real mode only */
  txDigest?: string;
}

export interface BetReceipt {
  position: Position;
  balanceUnits: bigint;
  txDigest?: string;
}

export interface CashOutReceipt {
  position: Position;
  payoutUnits: bigint;
  balanceUnits: bigint;
  txDigest?: string;
}

export interface SettlementEvent {
  position: Position;
  /** real oracle settlement price, 1e9 fixed-point */
  settlementPrice: bigint;
  won: boolean;
  payoutUnits: bigint;
}

export function positionMarketId(market: MarketParams): string {
  return `${market.oracleId}:${market.strike}:${market.isUp ? 'up' : 'down'}`;
}
