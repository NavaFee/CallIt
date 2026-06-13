import { createHash, createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * D-15 account-system acceptance: guest → Telegram link → cross-device
 * continuity. The Login Widget popup can't run headless, so these tests
 * sign widget payloads exactly the way Telegram does (secret =
 * SHA256(bot_token)) and drive POST /api/tg-login directly — the full
 * server path (verify → bind/restore → cookie) runs for real.
 *
 * The link/restore paths need users rows, so the journeys require
 * DATABASE_URL (same convention as flow.spec's leaderboard checks).
 */

const BOT_TOKEN = 'e2e:TEST-bot-token';
// unique per run — tg ids collide across runs on a shared database otherwise
const RUN_TAG = Date.now() % 1_000_000;
const TG_ALICE = 7_000_000 + RUN_TAG;
const TG_BOB = 8_000_000 + RUN_TAG;

function signedWidgetUser(fields: Record<string, string | number>): Record<string, string | number> {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join('\n');
  const secret = createHash('sha256').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return { ...fields, hash };
}

function widgetUser(id: number, username: string) {
  return signedWidgetUser({
    id,
    first_name: 'E2E',
    username,
    auth_date: Math.floor(Date.now() / 1000),
  });
}

function signedInitData(id: number, username: string): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAE2E2',
    user: JSON.stringify({ id, first_name: 'E2E', username }),
  });
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

async function sessionInfo(
  page: Page,
): Promise<{ address: string; managerId: string | null; balanceUnits: string }> {
  const res = await page.request.get('/api/session');
  const data = (await res.json()) as {
    session: { address: string; managerId: string | null } | null;
    balanceUnits?: string;
  };
  expect(data.session).not.toBeNull();
  return {
    address: data.session!.address,
    managerId: data.session!.managerId,
    balanceUnits: data.balanceUnits ?? '0',
  };
}

async function openPositionIds(page: Page): Promise<string[]> {
  const res = await page.request.get('/api/positions');
  const data = (await res.json()) as { positions?: Array<{ id: string; status: string }> };
  return (data.positions ?? [])
    .filter((p) => p.status === 'open')
    .map((p) => p.id)
    .sort();
}

async function currentStreak(page: Page): Promise<number> {
  const res = await page.request.get('/api/profile');
  const data = (await res.json()) as { stats: { streak: { current: number } } | null };
  return data.stats?.streak.current ?? 0;
}

test('guest plays → links Telegram → Mini App opens the SAME account', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'account linking needs Postgres (set DATABASE_URL)');

  // ── register as guest and play one round so the balance is distinctive ─
  await page.goto('/play');
  await expect(page.getByTestId('onboarding')).toBeVisible();
  // D-15 dual entry: Telegram is the primary door when the widget is configured
  await expect(page.getByTestId('tg-login-button')).toBeVisible();
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });

  await expect(page.getByTestId('call-up')).toBeEnabled({ timeout: 120_000 });
  await page.getByTestId('call-up').click();
  await page.getByTestId('stake-5').click();
  await page.getByTestId('lock-button').click();
  const cashout = page.getByTestId('cashout-button').locator('visible=true').first();
  await expect(cashout).toBeVisible({ timeout: 60_000 });
  await cashout.scrollIntoViewIfNeeded();
  // scroll past the fixed tab bar — banners above can push the card under it
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const box = (await cashout.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByTestId('result-overlay')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('result-close').click();

  const before = await sessionInfo(page);
  const streakBefore = await currentStreak(page);

  // ── link Telegram (server side of the Login Widget round-trip) ────────
  const link = await page.request.post('/api/tg-login', {
    data: { user: widgetUser(TG_ALICE, 'e2e_alice'), mode: 'link' },
  });
  expect(link.status()).toBe(200);
  const linked = (await link.json()) as { linked: boolean; session: { address: string } };
  expect(linked.linked).toBe(true);
  expect(linked.session.address).toBe(before.address); // same account, now recoverable

  await page.getByTestId('tab-profile').click();
  await expect(page.getByTestId('tg-linked-card')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('tg-linked-card')).toContainText('@e2e_alice');

  // ── wipe the browser, enter through the Mini App with the same tg id ──
  await page.context().clearCookies();
  await page.route('**/telegram-web-app.js', (route) => route.abort());
  await page.addInitScript((data) => {
    (window as unknown as Record<string, unknown>).Telegram = {
      WebApp: {
        initData: data,
        ready() {},
        expand() {},
        setHeaderColor() {},
        setBackgroundColor() {},
        enableClosingConfirmation() {},
        disableClosingConfirmation() {},
        HapticFeedback: { notificationOccurred() {}, impactOccurred() {} },
      },
    };
  }, signedInitData(TG_ALICE, 'e2e_alice'));
  await page.goto('/play');
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('onboarding')).toHaveCount(0);

  const after = await sessionInfo(page);
  expect(after.address).toBe(before.address); // same wallet
  expect(after.managerId).toBe(before.managerId); // same PredictManager
  expect(after.balanceUnits).toBe(before.balanceUnits); // same funds
  expect(await currentStreak(page)).toBe(streakBefore); // same streak
});

test('recovery: held position survives cleared cookies, restored by widget login', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'account recovery needs Postgres (set DATABASE_URL)');

  // ── guest registers and takes a position (real held state, not just the
  // welcome balance) so the restore proves funds+positions, not just identity ─
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });

  // wait for a live quote before clicking — call-up is disabled until then,
  // and clicking a disabled button is a silent no-op (no bet placed)
  await expect(page.getByTestId('call-up')).toBeEnabled({ timeout: 120_000 });
  await page.getByTestId('call-up').click();
  await page.getByTestId('stake-5').click();
  await expect(page.getByTestId('lock-button')).toBeEnabled();
  await page.getByTestId('lock-button').click();
  await expect(page.getByTestId('open-call').locator('visible=true').first()).toBeVisible({
    timeout: 60_000,
  });

  const before = await sessionInfo(page);
  const heldBefore = await openPositionIds(page);
  expect(heldBefore.length).toBeGreaterThan(0); // a live call is open
  expect(BigInt(before.balanceUnits)).toBeLessThan(25_000_000n); // stake was spent

  const link = await page.request.post('/api/tg-login', {
    data: { user: widgetUser(TG_BOB, 'e2e_bob'), mode: 'link' },
  });
  expect(link.status()).toBe(200);

  // browser reset — the cookie (and with it the only key copy) is gone
  await page.context().clearCookies();
  const gone = await page.request.get('/api/session');
  expect(((await gone.json()) as { session: unknown }).session).toBeNull();

  // widget re-login restores the sealed key from users.session_key_sealed
  const login = await page.request.post('/api/tg-login', {
    data: { user: widgetUser(TG_BOB, 'e2e_bob'), mode: 'login' },
  });
  expect(login.status()).toBe(200);
  const restored = (await login.json()) as {
    merged: boolean;
    session: { address: string; managerId: string | null };
  };
  expect(restored.merged).toBe(true);
  expect(restored.session.address).toBe(before.address);
  expect(restored.session.managerId).toBe(before.managerId);

  // same Sui address + same PredictManager + same balance + same open position
  const after = await sessionInfo(page);
  expect(after.address).toBe(before.address);
  expect(after.managerId).toBe(before.managerId);
  expect(after.balanceUnits).toBe(before.balanceUnits);
  expect(await openPositionIds(page)).toEqual(heldBefore);
});

test('binding conflict: a tg id already on another account returns 409 (switch flow)', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'binding conflict needs Postgres (set DATABASE_URL)');
  const TG_CAROL = 9_000_000 + RUN_TAG;

  // account 1 claims the tg id
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  const first = await page.request.post('/api/tg-login', {
    data: { user: widgetUser(TG_CAROL, 'e2e_carol'), mode: 'link' },
  });
  expect(first.status()).toBe(200);

  // a fresh guest account tries to link the SAME tg id → conflict, not theft.
  // the post-filming switch-flow UI (D-15 §4) consumes this exact signal.
  await page.context().clearCookies();
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  const conflict = await page.request.post('/api/tg-login', {
    data: { user: widgetUser(TG_CAROL, 'e2e_carol'), mode: 'link' },
  });
  expect(conflict.status()).toBe(409);
  expect(((await conflict.json()) as { code?: string }).code).toBe('tg-already-bound');
});

test('forged Login Widget payloads are rejected with 401', async ({ request }) => {
  // wrong hash entirely
  const tampered = { ...widgetUser(999_999, 'mallory'), hash: 'deadbeef'.repeat(8) };
  const res1 = await request.post('/api/tg-login', { data: { user: tampered, mode: 'login' } });
  expect(res1.status()).toBe(401);

  // signed with the Mini App key derivation instead of the widget one —
  // must not cross-validate
  const fields = { id: 999_998, auth_date: Math.floor(Date.now() / 1000) };
  const dcs = Object.entries(fields)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join('\n');
  const wrongSecret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const crossed = { ...fields, hash: createHmac('sha256', wrongSecret).update(dcs).digest('hex') };
  const res2 = await request.post('/api/tg-login', { data: { user: crossed, mode: 'login' } });
  expect(res2.status()).toBe(401);

  // a 401 must never set a session cookie
  const session = await request.get('/api/session');
  expect(((await session.json()) as { session: unknown }).session).toBeNull();
});
