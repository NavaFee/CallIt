import { NextResponse, type NextRequest } from 'next/server';
import { verifyTelegramLoginWidget } from '@callit/core';
import { jsonSafe } from '@/lib/server/clients';
import { getSession, saveSession } from '@/lib/server/session';
import { resolveTgLogin } from '@/lib/server/tgAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // a fresh login can run two on-chain transactions

/**
 * Dormant Login Widget fallback (the live web flow is the bot-nonce login —
 * /api/tg-login-start + /api/tg-login-poll — which needs no /setdomain). Kept
 * because the widget hash check is a useful, tested second path; the client no
 * longer invokes it. Verifies the widget payload (secret = SHA256(token)).
 */
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Telegram login is not configured' }, { status: 501 });
  }
  let body: { user?: Record<string, unknown>; mode?: 'login' | 'link' };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.user || typeof body.user !== 'object') {
    return NextResponse.json({ error: 'widget payload required' }, { status: 400 });
  }
  const mode = body.mode === 'link' ? 'link' : 'login';

  const verified = verifyTelegramLoginWidget(body.user, token);
  if (!verified) {
    return NextResponse.json({ error: 'widget verification failed' }, { status: 401 });
  }

  try {
    const outcome = await resolveTgLogin(getSession(), verified.id, verified.username, mode);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: 'This Telegram is already linked to another CallIt account', code: outcome.code },
        { status: 409 },
      );
    }
    saveSession(outcome.session);
    return NextResponse.json({
      session: jsonSafe({
        address: outcome.session.address,
        managerId: outcome.session.managerId,
        createdAt: outcome.session.createdAt,
      }),
      merged: outcome.merged,
      linked: true,
      username: verified.username ?? null,
      airdroppedUnits: outcome.airdroppedUnits.toString(),
      airdropFailed: outcome.airdropFailed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'telegram login failed' },
      { status: 500 },
    );
  }
}
