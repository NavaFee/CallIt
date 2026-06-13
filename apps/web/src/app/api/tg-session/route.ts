import { NextResponse, type NextRequest } from 'next/server';
import { verifyTelegramInitData } from '@callit/core';
import { clearTgBinding, getDb, setTgUsername, userByTgId } from '@callit/db';
import { jsonSafe } from '@/lib/server/clients';
import {
  createAccount,
  saveSession,
  type Session,
} from '@/lib/server/session';
import { unseal } from '@/lib/server/seal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // first visit runs two on-chain transactions

/**
 * Telegram Mini App login. The whole initData string is verified with the
 * official bot-token HMAC (forged tg ids would mean free airdrops — any
 * failure rejects hard). A tg id that previously bound or registered reuses
 * its account: same wallet, same manager, same balance.
 */
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mini App login is not configured' }, { status: 501 });
  }
  let body: { initData?: string };
  try {
    body = (await req.json()) as { initData?: string };
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.initData) return NextResponse.json({ error: 'initData required' }, { status: 400 });

  const verified = verifyTelegramInitData(body.initData, token);
  if (!verified?.user) {
    return NextResponse.json({ error: 'initData verification failed' }, { status: 401 });
  }
  const tgId = verified.user.id;

  try {
    // account merge: a tg id that bound via /start (or logged in here
    // before) reopens the SAME wallet and manager — never a new account
    const db = getDb();
    const existing = db ? await userByTgId(db, tgId) : null;
    if (existing?.sessionKeySealed) {
      const sk = unseal<string>(existing.sessionKeySealed);
      if (sk) {
        const session: Session = {
          sk,
          address: existing.id,
          managerId: existing.managerId,
          createdAt: Date.now(),
          provider: 'telegram',
        };
        saveSession(session);
        if (db && verified.user.username) {
          await setTgUsername(db, tgId, verified.user.username).catch(() => {});
        }
        return NextResponse.json({
          session: jsonSafe({
            address: session.address,
            managerId: session.managerId,
            createdAt: session.createdAt,
          }),
          merged: true,
          airdroppedUnits: '0',
          airdropFailed: false,
        });
      }
    }

    // legacy binding without a usable key: detach it so the unique tg index
    // doesn't block re-registration
    if (existing && db) await clearTgBinding(db, tgId).catch(() => {});
    const result = await createAccount({
      provider: 'telegram',
      tgChatId: tgId,
      tgUsername: verified.user.username,
      referrerId: verified.startParam,
    });
    saveSession(result.session);
    return NextResponse.json({
      session: jsonSafe({
        address: result.session.address,
        managerId: result.session.managerId,
        createdAt: result.session.createdAt,
      }),
      merged: false,
      airdroppedUnits: result.airdroppedUnits.toString(),
      airdropFailed: result.airdropFailed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'tg login failed' },
      { status: 500 },
    );
  }
}
