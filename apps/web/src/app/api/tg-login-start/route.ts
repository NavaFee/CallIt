import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createLoginNonce, getDb } from '@callit/db';
import { getSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Begin a bot one-click login: mint a one-time nonce (5-min TTL, bound to the
 * originating guest session for 'link' mode), and hand back the deep link the
 * client opens — t.me/<bot>?start=login_<nonce>. The bot binds the nonce to
 * the player's (trusted, message-derived) tg id; the client then polls
 * /api/tg-login-poll. No Login Widget, so no BotFather /setdomain needed.
 */
export async function POST(req: NextRequest) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const db = getDb();
  if (!botUsername || !db) {
    return NextResponse.json({ error: 'Telegram login is not configured' }, { status: 501 });
  }
  let body: { mode?: 'login' | 'link' } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body is fine — defaults to 'login'
  }
  const mode = body.mode === 'link' ? 'link' : 'login';
  const session = getSession();
  // 'link' only makes sense with a current account to attach
  const originAddress = mode === 'link' ? (session?.address ?? null) : null;

  const nonce = randomBytes(24).toString('base64url');
  await createLoginNonce(db, nonce, originAddress, mode);

  return NextResponse.json({
    nonce,
    botUsername,
    deepLink: `https://t.me/${botUsername}?start=login_${nonce}`,
  });
}
