import { expect, test } from '@playwright/test';

/**
 * A1: the chart must draw one gold LOCK line+marker PER open call, positioned
 * at each call's lock price, and de-dupe same-price locks. The bug drew only
 * one line for two positions. Two real bets rarely land on distinct $-grid
 * strikes on demand, and the fix is purely in rendering, so we feed the play
 * screen two different-strike positions (plus a same-price duplicate) via a
 * /api/positions intercept and assert exactly two markers.
 */
test('chart draws a lock marker per open call, de-duped by price', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });

  // the chart shows locks for the selected (first tradeable) oracle
  const market = (await page.request.get('/api/market').then((r) => r.json())) as {
    oracles: Array<{ oracleId: string; tradeable: boolean; spotUsd?: number }>;
  };
  const oracle = market.oracles.find((o) => o.tradeable) ?? market.oracles[0]!;
  const oracleId = oracle.oracleId;
  const base = Math.round(oracle.spotUsd ?? 63_000);

  const mk = (usd: number, isUp: boolean, n: number) => ({
    id: `${oracleId}:${usd}:${isUp ? 'up' : 'down'}:${n}`,
    market: {
      oracleId,
      expiry: String(Date.now() + 3_600_000), // far future — no settle fires
      strike: (BigInt(usd) * 1_000_000_000n).toString(),
      isUp,
    },
    quantityUnits: '7000000',
    costUnits: '5000000',
    askPrice: '700000000',
    placedAt: Date.now(),
    status: 'open',
    cashoutUnits: '4800000',
  });

  // two distinct lock prices + one duplicate of the first → expect TWO markers
  const positions = [mk(base + 10, true, 1), mk(base - 12, false, 2), mk(base + 10, true, 3)];
  await page.route('**/api/positions', (route) =>
    route.fulfill({ json: { positions, balanceUnits: '20000000' } }),
  );

  // the next positions poll (≤12s) feeds the crafted set into the chart
  await expect(page.getByTestId('chart-lock')).toHaveCount(2, { timeout: 16_000 });

  // the two markers sit at different heights (different lock prices) and carry
  // the side they belong to
  const tops = await page.getByTestId('chart-lock').evaluateAll((els) =>
    els.map((e) => ({ top: (e as HTMLElement).style.top, side: e.getAttribute('data-side') })),
  );
  expect(new Set(tops.map((t) => t.top)).size).toBe(2);
  expect(new Set(tops.map((t) => t.side))).toEqual(new Set(['up', 'down']));
});
