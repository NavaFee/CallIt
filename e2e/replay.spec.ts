import { expect, test } from '@playwright/test';

/**
 * B2 — revisit replay. On open, calls that auto-settled while away replay the
 * most recent celebration once (the rest go in one toast), then the seen
 * marker advances so they never replay again. A real won/lost needs a 15-min
 * expiry, so we drive the client deterministically via the /api/settlements
 * intercept; the seen marker is server-authoritative and exercised by the
 * /seen POST the client fires on dismiss.
 */
test('revisit replays the latest unseen settlement once, then not again', async ({ page }) => {
  // a session must exist at boot for the replay to run, so register first
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });

  // two unseen auto-settlements (one win to replay + one more → "+1 more" toast)
  const unseen = {
    settlements: [
      {
        id: 'o1:64000:up:1',
        isUp: true,
        strike: (64_000n * 1_000_000_000n).toString(),
        costUnits: '5000000',
        payoutUnits: '9800000',
        won: true,
        settledAt: Date.now() - 1000,
      },
      {
        id: 'o2:63000:down:1',
        isUp: false,
        strike: (63_000n * 1_000_000_000n).toString(),
        costUnits: '5000000',
        payoutUnits: '0',
        won: false,
        settledAt: Date.now() - 5000,
      },
    ],
    balanceUnits: '29800000',
  };
  await page.route('**/api/settlements/unseen', (r) => r.fulfill({ json: unseen }));
  let seenAck = 0;
  await page.route('**/api/settlements/seen', (r) => {
    seenAck += 1;
    return r.fulfill({ json: { ok: true } });
  });

  // reload: boot now sees the session → fetches unseen → replays the latest
  await page.reload();
  const overlay = page.getByTestId('result-overlay');
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('CALLED IT!'); // the most recent (won) call
  await page.getByTestId('result-close').click();
  expect(seenAck).toBeGreaterThan(0); // seen marker advanced on dismiss

  // once seen (real unseen is empty — the crafted ones were never in the DB),
  // a fresh open does not replay
  await page.unroute('**/api/settlements/unseen');
  await page.reload();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('result-overlay')).toHaveCount(0);
});
