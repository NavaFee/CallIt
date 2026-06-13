'use client';

/**
 * Telegram Login Widget driver (web only — the Mini App logs in silently
 * via initData). Uses the JS-API flavor of the official widget so the
 * buttons stay ours; Telegram.Login.auth opens the oauth.telegram.org
 * popup and hands back a signed payload the server re-verifies.
 *
 * Requires the bot's domain to be registered with @BotFather (/setdomain);
 * config (bot id) is served by GET /api/session, no public env needed.
 */

export interface TgWidgetConfig {
  botId: string;
  botUsername: string;
}

interface TelegramLoginGlobal {
  Login?: {
    auth: (
      opts: { bot_id: string; request_access?: boolean },
      cb: (user: Record<string, unknown> | false) => void,
    ) => void;
  };
}

const WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';
let widgetLoading: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
  if ((window as unknown as { Telegram?: TelegramLoginGlobal }).Telegram?.Login) {
    return Promise.resolve();
  }
  if (!widgetLoading) {
    widgetLoading = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = WIDGET_SRC;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        widgetLoading = null;
        reject(new Error('Telegram widget failed to load'));
      };
      document.head.appendChild(el);
    });
  }
  return widgetLoading;
}

/** Resolves with the signed widget payload, or null if the user backed out. */
async function widgetAuth(botId: string): Promise<Record<string, unknown> | null> {
  await loadWidgetScript();
  const tg = (window as unknown as { Telegram?: TelegramLoginGlobal }).Telegram;
  if (!tg?.Login) throw new Error('Telegram widget unavailable');
  return new Promise((resolve) => {
    tg.Login!.auth({ bot_id: botId, request_access: false }, (user) => resolve(user || null));
  });
}

export interface TgLoginResult {
  session: { address: string; managerId: string | null; createdAt: number };
  merged: boolean;
  linked: boolean;
  username: string | null;
  airdroppedUnits: string;
  airdropFailed: boolean;
}

/**
 * Full widget round-trip: popup → server verify → cookie write.
 * Returns null when the user closed the popup without authorizing.
 * Throws with the server's message on conflict (409) and other failures.
 */
export async function telegramAuth(
  widget: TgWidgetConfig,
  mode: 'login' | 'link',
): Promise<TgLoginResult | null> {
  const user = await widgetAuth(widget.botId);
  if (!user) return null;
  const res = await fetch('/api/tg-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user, mode }),
  });
  const data = (await res.json().catch(() => ({}))) as TgLoginResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `telegram ${mode} failed`);
  window.dispatchEvent(new CustomEvent('callit:session-changed'));
  return data;
}
