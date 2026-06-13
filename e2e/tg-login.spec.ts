import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * B1 — bot one-click login (the nonce flow that replaced the Login Widget).
 * Production binds the nonce from the bot's trusted message; here we bind via
 * the initData-verified /api/tg-login-bind (same trust, signed with the e2e
 * bot token) so the full web start→bind→poll path runs for real. Nonces are
 * DB-backed, so these journeys need DATABASE_URL.
 */
const BOT_TOKEN = 'e2e:TEST-bot-token';
const RUN = Date.now() % 1_000_000;

function signedInitData(id: number, username: string): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAlogin',
    user: JSON.stringify({ id, first_name: 'E2E', username }),
  });
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return params.toString();
}

const start = async (req: APIRequestContext, mode: 'login' | 'link' = 'login') => {
  const r = await req.post('/api/tg-login-start', { data: { mode } });
  expect(r.status()).toBe(200);
  return (await r.json()).nonce as string;
};
const bind = (req: APIRequestContext, nonce: string, id: number, u: string) =>
  req.post('/api/tg-login-bind', { data: { nonce, initData: signedInitData(id, u) } });
const poll = (req: APIRequestContext, nonce: string) =>
  req.post('/api/tg-login-poll', { data: { nonce } });

test('nonce login: start → bind → poll issues a session, and is single-use', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'login nonces need Postgres (set DATABASE_URL)');
  const TG = 6_100_000 + RUN;
  const nonce = await start(request);

  // before the bot binds it, the poll is pending (not an error)
  const pending = await poll(request, nonce);
  expect(pending.status()).toBe(200);
  expect((await pending.json()).pending).toBe(true);

  expect((await bind(request, nonce, TG, 'e2e_login')).status()).toBe(200);

  const done = await poll(request, nonce);
  expect(done.status()).toBe(200);
  const addr = (await done.json()).session.address as string;
  expect(addr).toMatch(/^0x[0-9a-f]+$/);

  // single-use: a second poll never resolves the same nonce again
  expect((await poll(request, nonce)).status()).toBe(410);
});

test('nonce rejects unknown nonces and double-bind', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'login nonces need Postgres (set DATABASE_URL)');
  expect((await poll(request, 'no-such-nonce')).status()).toBe(410);
  expect((await bind(request, 'no-such-nonce', 6_200_000 + RUN, 'x')).status()).toBe(410);

  const nonce = await start(request);
  expect((await bind(request, nonce, 6_210_000 + RUN, 'once')).status()).toBe(200);
  // already bound — a second bind is refused
  expect((await bind(request, nonce, 6_220_000 + RUN, 'twice')).status()).toBe(410);
});

test('cross-session: each nonce resolves only its own tg identity', async ({ playwright }) => {
  test.skip(!process.env.DATABASE_URL, 'login nonces need Postgres (set DATABASE_URL)');
  const a = await playwright.request.newContext({ baseURL: 'http://localhost:3199' });
  const b = await playwright.request.newContext({ baseURL: 'http://localhost:3199' });
  const TGA = 6_300_000 + RUN;
  const TGB = 6_400_000 + RUN;
  const nA = await start(a);
  const nB = await start(b);
  await bind(a, nA, TGA, 'alice');
  await bind(b, nB, TGB, 'bob');
  const addrA = (await (await poll(a, nA)).json()).session.address as string;
  const addrB = (await (await poll(b, nB)).json()).session.address as string;
  expect(addrA).not.toBe(addrB); // B's nonce never yields A's account
  // and a nonce can't be resolved from the other session's jar after consume
  expect((await poll(b, nA)).status()).toBe(410);
  await a.dispose();
  await b.dispose();
});

test('nonce link binds the guest account; later login restores the same one', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'login nonces need Postgres (set DATABASE_URL)');
  const TG = 6_500_000 + RUN;

  // guest registers, then links via the nonce flow (poll reads the guest cookie)
  await page.goto('/play');
  await page.getByTestId('claim-button').click();
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 60_000 });
  const before = (await page.request.get('/api/session').then((r) => r.json())).session.address as string;

  const linkNonce = await start(page.request, 'link');
  expect((await bind(page.request, linkNonce, TG, 'e2e_link')).status()).toBe(200);
  const linked = await (await poll(page.request, linkNonce)).json();
  expect(linked.linked).toBe(true);
  expect(linked.session.address).toBe(before); // same account, now recoverable

  // a fresh browser logs in with the same tg id → the SAME account restored
  await page.context().clearCookies();
  const loginNonce = await start(page.request, 'login');
  expect((await bind(page.request, loginNonce, TG, 'e2e_link')).status()).toBe(200);
  const restored = await (await poll(page.request, loginNonce)).json();
  expect(restored.merged).toBe(true);
  expect(restored.session.address).toBe(before);
});
