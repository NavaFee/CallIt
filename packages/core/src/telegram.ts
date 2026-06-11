import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Telegram Mini App initData verification — the official algorithm:
 * secret = HMAC_SHA256(bot_token, key="WebAppData");
 * hash   = hex(HMAC_SHA256(data_check_string, secret))
 * where data_check_string is all fields except `hash`, sorted, joined by \n.
 *
 * A forged tg id means free airdrops, so failures reject hard — no fallback.
 */

export interface TelegramInitData {
  user?: {
    id: number;
    first_name?: string;
    username?: string;
  };
  /** startapp deep-link payload (referrer id for share links) */
  startParam?: string;
  authDate: number;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 3600,
  nowMs: number = Date.now(),
): TelegramInitData | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(expected, 'hex');
  let b: Buffer;
  try {
    b = Buffer.from(hash, 'hex');
  } catch {
    return null;
  }
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  if (nowMs / 1000 - authDate > maxAgeSeconds) return null;

  let user: TelegramInitData['user'];
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as TelegramInitData['user'];
    } catch {
      return null;
    }
  }
  if (!user || typeof user.id !== 'number') return null;

  return { user, startParam: params.get('start_param') ?? undefined, authDate };
}

/** Test/build helper: produce a correctly signed initData string. */
export function buildTelegramInitData(
  botToken: string,
  fields: Record<string, string>,
): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}
