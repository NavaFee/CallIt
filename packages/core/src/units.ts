/**
 * Scaling and unit conversions for DeepBook Predict.
 *
 * Protocol conventions (see packages/predict/sources/helper/constants.move):
 * - Prices, probabilities, strikes and SVI params are fixed-point u64 scaled
 *   by FLOAT_SCALING = 1e9. e.g. strike 61_351 USD → 61_351_000_000_000.
 * - Quote assets must have 6 decimals (dUSDC). `quantity` on mint/redeem is
 *   denominated in quote units and equals the settlement notional:
 *   quantity 10_000_000 pays out 10 dUSDC if the position settles in the money.
 * - mint cost = ask_price × quantity / 1e9 (in quote units).
 */

export const FLOAT_SCALING = 1_000_000_000n;
export const DUSDC_DECIMALS = 6;
export const DUSDC_UNIT = 1_000_000n;

/** USD price (e.g. 61351.52) → protocol fixed-point u64. */
export function usdToFixed(usd: number): bigint {
  return BigInt(Math.round(usd * 1e9));
}

/** Protocol fixed-point u64 → USD number (display only; loses sub-nano precision). */
export function fixedToUsd(fixed: bigint | string | number): number {
  return Number(BigInt(fixed)) / 1e9;
}

/** dUSDC display amount (e.g. 10.5) → quote units. */
export function dusdcToUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 1e6));
}

/** Quote units → dUSDC display amount. */
export function unitsToDusdc(units: bigint | string | number): number {
  return Number(BigInt(units)) / 1e6;
}

/** Total mint cost in quote units for a payout notional at a given ask price. */
export function mintCost(askPriceFixed: bigint, quantityUnits: bigint): bigint {
  return (askPriceFixed * quantityUnits) / FLOAT_SCALING;
}

/**
 * Multiplier shown in the UI: payout-per-cost for a binary position.
 * ask 0.40 → ×2.5 (stake 10 dUSDC of premium controls 25 dUSDC of notional).
 */
export function payoutMultiplier(askPriceFixed: bigint): number {
  const ask = Number(askPriceFixed) / 1e9;
  if (ask <= 0) return 0;
  return 1 / ask;
}

/**
 * Convert a stake (premium the user wants to spend, in quote units) into the
 * position quantity (settlement notional, in quote units) at a given ask.
 * quantity = stake / ask. Floors to whole quote units.
 */
export function stakeToQuantity(stakeUnits: bigint, askPriceFixed: bigint): bigint {
  if (askPriceFixed <= 0n) return 0n;
  return (stakeUnits * FLOAT_SCALING) / askPriceFixed;
}

/**
 * Snap a USD spot price to the oracle's strike grid.
 * Strikes are valid iff min ≤ s and (s − min) % tick == 0.
 */
export function nearestStrike(
  spotFixed: bigint,
  minStrike: bigint,
  tickSize: bigint,
): bigint {
  if (spotFixed <= minStrike) return minStrike;
  const offset = spotFixed - minStrike;
  const ticks = (offset + tickSize / 2n) / tickSize;
  return minStrike + ticks * tickSize;
}
