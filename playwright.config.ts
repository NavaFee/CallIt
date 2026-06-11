import { defineConfig, devices } from '@playwright/test';

// Local proxies (http_proxy/all_proxy) must never intercept the loopback
// health check, or Playwright mistakes a proxy error page for "server up".
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1']
  .filter(Boolean)
  .join(',');
process.env.no_proxy = process.env.NO_PROXY;

/**
 * E2E runs the web app in MOCK_FUNDS mode: custody is simulated, but every
 * price/quote on screen is live DeepBook Predict testnet data — so these
 * tests exercise the real read path end to end.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3199',
    // mobile-first viewport on chromium (webkit needs a second browser download)
    ...devices['Pixel 7'],
  },
  webServer: {
    command: 'pnpm --filter @callit/web exec next dev -p 3199',
    url: 'http://localhost:3199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      // E2E_REAL=1 exercises real custody end to end — spends testnet dUSDC
      // (welcome airdrop + spread) and needs SPONSOR_KEY in the environment.
      MOCK_FUNDS: process.env.E2E_REAL === '1' ? '' : '1',
      SESSION_SECRET: 'e2e-secret',
      ...(process.env.E2E_REAL === '1' ? {} : { SPONSOR_KEY: '', OPS_WALLET_KEY: '' }),
    },
  },
});
