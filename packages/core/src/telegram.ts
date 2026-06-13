import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

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

/**
 * Telegram Login Widget verification (web login, NOT the Mini App):
 * secret = SHA256(bot_token)  — raw digest, unlike initData's
 *          HMAC_SHA256(bot_token, key="WebAppData");
 * hash   = hex(HMAC_SHA256(data_check_string, secret))
 * The payload is flat ({id, first_name, username?, photo_url?, auth_date,
 * hash}) — no nested `user` JSON and no start_param. Same hard-reject
 * policy: a forged id is a free wallet takeover.
 */

export interface TelegramWidgetUser {
  id: number;
  firstName?: string;
  username?: string;
  authDate: number;
}

export function verifyTelegramLoginWidget(
  payload: Record<string, unknown>,
  botToken: string,
  maxAgeSeconds = 24 * 3600,
  nowMs: number = Date.now(),
): TelegramWidgetUser | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const hash = payload.hash;
  if (typeof hash !== 'string' || hash.length === 0) return null;

  const dataCheckString = Object.entries(payload)
    .filter(([k, v]) => k !== 'hash' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join('\n');
  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  // Buffer.from(bad hex) silently truncates — the length check is the guard
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const authDate = Number(payload.auth_date ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  if (nowMs / 1000 - authDate > maxAgeSeconds) return null;

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    firstName: typeof payload.first_name === 'string' ? payload.first_name : undefined,
    username: typeof payload.username === 'string' ? payload.username : undefined,
    authDate,
  };
}

/** Test/build helper: sign a Login Widget payload the way Telegram does. */
export function buildTelegramLoginWidgetPayload(
  botToken: string,
  fields: Record<string, string | number>,
): Record<string, string | number> {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join('\n');
  const secret = createHash('sha256').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return { ...fields, hash };
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
