import { NextResponse, type NextRequest } from 'next/server';
import { verifyTelegramInitData } from '@callit/core';
import { bindLoginNonce, getDb } from '@callit/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * initData-verified nonce bind. In production the WORKER bot binds the nonce
 * directly (trusted ctx.from on /start login_<nonce>); this endpoint is the
 * equivalent for a caller that holds verifiable initData — the Mini App
 * completing a web-initiated login, and the e2e harness. Same trust as
 * /api/tg-session (HMAC against TELEGRAM_BOT_TOKEN).
 */
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const db = getDb();
  if (!token || !db) {
    return NextResponse.json({ error: 'Telegram login is not configured' }, { status: 501 });
  }
  let body: { nonce?: string; initData?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.nonce || !body.initData) {
    return NextResponse.json({ error: 'nonce and initData required' }, { status: 400 });
  }
  const verified = verifyTelegramInitData(body.initData, token);
  if (!verified?.user) {
    return NextResponse.json({ error: 'initData verification failed' }, { status: 401 });
  }
  const outcome = await bindLoginNonce(db, body.nonce, verified.user.id, verified.user.username);
  if (outcome === 'invalid') {
    return NextResponse.json({ error: 'login link expired or already used' }, { status: 410 });
  }
  return NextResponse.json({ ok: true });
}
