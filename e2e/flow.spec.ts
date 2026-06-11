import { expect, test } from '@playwright/test';

/**
 * Full user journey in MOCK_FUNDS mode against live testnet market data:
 * register → welcome airdrop → bet → open call → cash out → leaderboard.
 *
 * Requires at least one tradeable oracle on testnet; if every oracle's feed
 * is stale the suite fails by design (that is an incident, not noise).
 */

const WELCOME = Number(process.env.NEXT_PUBLIC_WELCOME_DUSDC ?? '25');

async function balanceOf(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('balance').textContent();
  return Number(text!.replace(/,/g, ''));
}

test('register → bet → cash out → leaderboard', async ({ page }) => {
  await page.goto('/play');

  // ── onboarding: one tap to a funded account ──────────────────────
  await expect(page.getByTestId('onboarding')).toBeVisible();
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  expect(await balanceOf(page)).toBe(WELCOME);

  // ── live market: price ticking, quotes priced by the protocol ────
  // first market load includes the heavy oracle-list fetch (2 MB, 2–90s)
  await expect(page.getByTestId('live-price')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('call-up')).toBeEnabled({ timeout: 60_000 });
  await expect(page.getByTestId('call-up')).toContainText('×');

  // ── place a $5 UP call ────────────────────────────────────────────
  await page.getByTestId('call-up').click();
  await page.getByTestId('stake-5').click();
  await page.getByTestId('lock-button').click();
  // open-call renders in both the mobile section and the desktop rail (DOM-hidden)
  const openCall = page.getByTestId('open-call').locator('visible=true').first();
  await expect(openCall).toBeVisible({ timeout: 60_000 });
  const afterBet = await balanceOf(page);
  expect(afterBet).toBeLessThan(WELCOME);
  // sub-second feed updates can drift the executed cost a hair past the chip
  expect(afterBet).toBeGreaterThanOrEqual(WELCOME - 5.5);

  // ── hold-to-confirm cash out at the live bid ─────────────────────
  const cashout = page.getByTestId('cashout-button').locator('visible=true').first();
  const box = (await cashout.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByTestId('result-overlay')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('result-overlay')).toContainText('CASHED OUT');
  await page.getByTestId('result-close').click();

  // cash-out returns most of the stake; in fast markets the exit can even
  // be profitable, so only bound it loosely above the post-bet level
  await expect.poll(() => balanceOf(page), { timeout: 15_000 }).toBeGreaterThan(afterBet);
  expect(await balanceOf(page)).toBeLessThan(WELCOME + 5);

  // ── leaderboard reflects the realized result (needs DATABASE_URL) ─
  await page.getByTestId('tab-ranks').click();
  await expect(page.getByTestId('ranks-screen')).toBeVisible();
  if (process.env.DATABASE_URL) {
    await expect(page.getByTestId('ranks-screen')).toContainText('you', { timeout: 20_000 });
  }

  // ── profile shows the call history and badges ─────────────────────
  await page.getByTestId('tab-profile').click();
  await expect(page.getByTestId('profile-screen')).toBeVisible();
  if (process.env.DATABASE_URL) {
    await expect(page.getByTestId('profile-screen')).toContainText('CASH-OUT');
  }
});

test('oracle fuse: stale feeds disable betting', async ({ page }) => {
  // Force the fuse by intercepting the market poll and aging the feeds.
  await page.route('**/api/market', async (route) => {
    try {
      const response = await route.fetch();
      const body = (await response.json()) as {
        oracles: Array<Record<string, unknown>>;
      };
      body.oracles = body.oracles.map((o) => ({
        ...o,
        tradeable: false,
        fuse: { reason: 'price_stale', detail: 'last price update 99s ago (limit 25s)' },
      }));
      await route.fulfill({ json: body });
    } catch {
      // a poll can still be in flight when the test ends — never fail on it
      await route.abort().catch(() => {});
    }
  });

  await page.goto('/play');
  const claim = page.getByTestId('claim-button');
  if (await claim.isVisible().catch(() => false)) {
    await claim.click();
    await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  }

  await expect(page.getByTestId('fuse-banner')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('fuse-banner')).toContainText('ORACLE STALE');
  await expect(page.getByTestId('call-up')).toBeDisabled();
  await expect(page.getByTestId('call-down')).toBeDisabled();
});
