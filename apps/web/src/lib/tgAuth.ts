'use client';

/**
 * Bot one-click login (replaces the phone-number Login Widget — and with it
 * the BotFather /setdomain requirement). The server mints a one-time nonce,
 * the player deep-links into the bot which binds it from the trusted message,
 * and we poll until the session is issued.
 */

/** Availability + bot handle, served by GET /api/session as `tgWidget`. */
export interface TgWidgetConfig {
  botId: string;
  botUsername: string;
}

export interface TgLoginResult {
  session: { address: string; managerId: string | null; createdAt: number };
  merged: boolean;
  linked: boolean;
  username: string | null;
  airdroppedUnits: string;
  airdropFailed: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns the login result, or null if the player never completes it (closed
 * Telegram, or the link expired). Throws an Error with `.code ===
 * 'tg-already-bound'` on a link conflict so callers can offer the switch flow.
 */
export async function telegramLogin(mode: 'login' | 'link'): Promise<TgLoginResult | null> {
  const start = await fetch('/api/tg-login-start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  const s = (await start.json().catch(() => ({}))) as {
    nonce?: string;
    deepLink?: string;
    error?: string;
  };
  if (!start.ok || !s.nonce || !s.deepLink) {
    throw new Error(s.error ?? 'Telegram login unavailable');
  }

  // opens the Telegram app / web; the player taps Start and the bot binds it
  window.open(s.deepLink, '_blank');

  // poll for ~3 min (nonce TTL is 5 min server-side)
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    let res: Response;
    try {
      res = await fetch('/api/tg-login-poll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nonce: s.nonce }),
      });
    } catch {
      continue; // transient network — keep polling
    }
    if (res.status === 409) {
      const d = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      const err = new Error(d.error ?? 'This Telegram is already linked to another account') as Error & {
        code?: string;
      };
      err.code = d.code;
      throw err;
    }
    if (res.status === 410) return null; // expired or already used
    if (!res.ok) continue;
    const d = (await res.json().catch(() => ({}))) as TgLoginResult & { pending?: boolean };
    if (d.pending) continue;
    if (d.session) {
      window.dispatchEvent(new CustomEvent('callit:session-changed'));
      return d;
    }
  }
  return null;
}
