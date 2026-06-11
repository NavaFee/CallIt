import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';

/**
 * Telegram Mini App journey with a mocked WebApp host: initData is signed
 * with the same test bot token the server verifies against (set in
 * playwright.config webServer env), so the full auth path runs for real —
 * only the Telegram client chrome is stubbed.
 */

const BOT_TOKEN = 'e2e:TEST-bot-token';
const TG_USER_ID = 990001;

function signedInitData(): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAE2E',
    user: JSON.stringify({ id: TG_USER_ID, first_name: 'E2E', username: 'e2e_caller' }),
    start_param: '0xreferrer-e2e',
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

test('mini app: silent login → bet via MainButton → cash out', async ({ page }) => {
  const initData = signedInitData();
  // the real telegram-web-app.js would overwrite our stubbed host — block it
  await page.route('**/telegram-web-app.js', (route) => route.abort());
  await page.addInitScript((data) => {
    const mainButton = {
      _cb: null as null | (() => void),
      _visible: false,
      _text: '',
      setParams(p: { text?: string }) {
        if (p.text) this._text = p.text;
      },
      show() {
        this._visible = true;
      },
      hide() {
        this._visible = false;
      },
      onClick(cb: () => void) {
        this._cb = cb;
      },
      offClick() {
        this._cb = null;
      },
    };
    (window as unknown as Record<string, unknown>).Telegram = {
      WebApp: {
        initData: data,
        ready() {},
        expand() {},
        setHeaderColor() {},
        setBackgroundColor() {},
        enableClosingConfirmation() {},
        disableClosingConfirmation() {},
        MainButton: mainButton,
        HapticFeedback: { notificationOccurred() {} },
      },
    };
  }, initData);

  await page.goto('/play');

  // silent registration: no onboarding, balance appears on its own
  await expect(page.getByTestId('balance')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('onboarding')).toHaveCount(0);

  // place a bet — the in-page lock button is replaced by Telegram's MainButton
  await expect(page.getByTestId('call-up')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('call-up').click();
  await page.getByTestId('stake-5').click();
  await expect(page.getByTestId('lock-button')).toHaveCount(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const mb = (window as never as { Telegram: { WebApp: { MainButton: { _visible: boolean; _text: string } } } })
            .Telegram.WebApp.MainButton;
          return mb._visible && mb._text.includes('LOCK IT IN');
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => {
    const mb = (window as never as { Telegram: { WebApp: { MainButton: { _cb: null | (() => void) } } } })
      .Telegram.WebApp.MainButton;
    mb._cb?.();
  });

  const openCall = page.getByTestId('open-call').locator('visible=true').first();
  await expect(openCall).toBeVisible({ timeout: 60_000 });

  // cash out as usual
  const cashout = page.getByTestId('cashout-button').locator('visible=true').first();
  const box = (await cashout.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByTestId('result-overlay')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('result-overlay')).toContainText('CASHED OUT');
  await page.getByTestId('result-close').click();

  // profile must show the linked state — never the connect CTA in the Mini App
  await page.getByTestId('tab-profile').click();
  await expect(page.getByTestId('tg-linked-card')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('tg-linked-card')).toContainText('Telegram linked');
  await expect(page.getByTestId('tg-connect-card')).toHaveCount(0);
});

test('mini app: forged initData is rejected', async ({ request }) => {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: 666, first_name: 'Mallory' }),
    hash: 'deadbeef'.repeat(8),
  });
  const res = await request.post('/api/tg-session', {
    data: { initData: params.toString() },
  });
  expect(res.status()).toBe(401);
});
