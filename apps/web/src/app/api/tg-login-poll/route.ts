import { NextResponse, type NextRequest } from 'next/server';
import { consumeLoginNonce, getDb } from '@callit/db';
import { jsonSafe } from '@/lib/server/clients';
import { getSession, saveSession } from '@/lib/server/session';
import { resolveTgLogin } from '@/lib/server/tgAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // resolving a fresh account runs on-chain txs

/**
 * Poll a bot-login nonce. While unbound → { pending: true }. Once the bot
 * (or initData bind) has attached a tg id, the nonce is consumed exactly once
 * and the tg account is resolved (restore / link / create), writing the
 * session cookie. Expired / consumed / unknown → 410. A link conflict → 409.
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Telegram login is not configured' }, { status: 501 });
  let body: { nonce?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.nonce) return NextResponse.json({ error: 'nonce required' }, { status: 400 });

  const state = await consumeLoginNonce(db, body.nonce);
  if (state.status === 'pending') return NextResponse.json({ pending: true });
  if (state.status !== 'ready') {
    // gone / expired / consumed — one-time, never resolves twice
    return NextResponse.json({ error: `login link ${state.status}` }, { status: 410 });
  }

  // 'link' carries the originating guest session via the cookie; 'login'
  // resolves purely from the tg id (the current cookie, if any, is ignored
  // for restore). resolveTgLogin reads getSession() for the link case.
  try {
    const outcome = await resolveTgLogin(
      state.mode === 'link' ? getSession() : null,
      state.tgChatId,
      state.tgUsername ?? undefined,
      state.mode,
    );
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
      username: state.tgUsername ?? null,
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
