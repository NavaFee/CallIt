import { chromium } from '@playwright/test';
const browser = await chromium.launch();
// desktop HUD
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto('http://localhost:3173', { waitUntil: 'networkidle' });
const btn = desktop.getByTestId('claim-button');
if (await btn.isVisible().catch(() => false)) {
  await btn.click();
  await desktop.waitForSelector('[data-testid="balance"]', { timeout: 60000 });
}
await desktop.waitForTimeout(5000);
await desktop.screenshot({ path: '/tmp/callit-desktop.png' });
// landing
const landing = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await landing.goto('http://localhost:3173/welcome', { waitUntil: 'networkidle' });
await landing.waitForTimeout(4000);
await landing.screenshot({ path: '/tmp/callit-landing.png' });
await browser.close();
