import type { MarketParams, PredictService } from '../chain/predictService.js';
import { stakeToQuantity } from '../units.js';

export interface SizedTrade {
  /** settlement notional, 1e6 units */
  quantityUnits: bigint;
  /** total premium at the post-trade ask, guaranteed ≤ stake */
  costUnits: bigint;
  /** effective ask (cost/quantity), 1e9 fixed-point */
  askPrice: bigint;
  /** what an immediate redeem of the same quantity returns (bid side) */
  redeemUnits: bigint;
}

/**
 * Size a bet so the protocol-quoted cost never exceeds the user's stake.
 *
 * The protocol prices at the post-trade ask: bigger orders shift vault
 * exposure and quote slightly worse than a 1-unit probe predicts. So we
 * probe, size, re-quote at the actual quantity, and shrink once if the real
 * cost overshoots the stake.
 */
export async function sizeStake(
  predict: PredictService,
  market: MarketParams,
  stakeUnits: bigint,
): Promise<SizedTrade> {
  if (stakeUnits <= 0n) throw new Error('stake must be positive');

  const probe = 1_000_000n;
  const { mintCost: probeCost } = await predict.getTradeAmounts(market, probe);
  const probeAsk = (probeCost * 1_000_000_000n) / probe;
  let quantity = stakeToQuantity(stakeUnits, probeAsk);
  if (quantity <= 0n) throw new Error('stake too small for current ask');

  let { mintCost, redeemPayout } = await predict.getTradeAmounts(market, quantity);
  if (mintCost > stakeUnits) {
    quantity = (quantity * stakeUnits) / mintCost;
    if (quantity <= 0n) throw new Error('stake too small for current ask');
    ({ mintCost, redeemPayout } = await predict.getTradeAmounts(market, quantity));
  }

  const askPrice = quantity > 0n ? (mintCost * 1_000_000_000n) / quantity : 0n;
  return { quantityUnits: quantity, costUnits: mintCost, askPrice, redeemUnits: redeemPayout };
}
