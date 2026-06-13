import { NextResponse, type NextRequest } from 'next/server';
import { verifyTelegramLoginWidget } from '@callit/core';
import { clearTgBinding, getDb, linkTelegramAccount, setTgUsername, userByTgId } from '@callit/db';
import { jsonSafe } from '@/lib/server/clients';
import {
  createAccount,
  getSession,
  saveSession,
  type Session,
} from '@/lib/server/session';
import { seal, unseal } from '@/lib/server/seal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // a fresh login can run two on-chain transactions

/**
 * Telegram Login Widget endpoint (web — the Mini App uses /api/tg-session).
 * The widget payload is hash-verified server-side (secret = SHA256(token));
 * a forged id would be a wallet takeover, so failures reject hard.
 *
 * mode 'link'  — bind the CURRENT session's account to the tg identity
 *                (guest → recoverable account; same address, same funds).
 * mode 'login' — restore the account that owns this tg id (cleared cookies,
 *                new device); falls back to link when the visitor already
 *                has a session, or to a fresh TG-bound account otherwise.
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
    const db = getDb();
    const session = getSession();
    const existing = db ? await userByTgId(db, verified.id) : null;

    // ── this tg id already owns an account ──────────────────────────────
    if (existing?.sessionKeySealed) {
      const sk = unseal<string>(existing.sessionKeySealed);
      if (sk) {
        if (mode === 'link' && session && session.address !== existing.id) {
          // binding conflict — switching flows land post-filming (D-15 §4)
          return NextResponse.json(
            {
              error: 'This Telegram is already linked to another CallIt account',
              code: 'tg-already-bound',
            },
            { status: 409 },
          );
        }
        const restored: Session = {
          sk,
          address: existing.id,
          managerId: existing.managerId,
          createdAt: Date.now(),
          provider: 'telegram',
        };
        saveSession(restored);
        if (db && verified.username) {
          await setTgUsername(db, verified.id, verified.username).catch(() => {});
        }
        return NextResponse.json({
          session: jsonSafe({
            address: restored.address,
            managerId: restored.managerId,
            createdAt: restored.createdAt,
          }),
          merged: true,
          linked: true,
          username: verified.username ?? null,
          airdroppedUnits: '0',
          airdropFailed: false,
        });
      }
      // legacy row with an unusable key — free the unique index
      if (db) await clearTgBinding(db, verified.id).catch(() => {});
    }

    // ── tg id is fresh: bind the current account if there is one ────────
    if (session) {
      if (!db) {
        return NextResponse.json(
          { error: 'linking needs the account database on this deployment' },
          { status: 501 },
        );
      }
      const outcome = await linkTelegramAccount(db, {
        userId: session.address,
        managerId: session.managerId,
        tgChatId: verified.id,
        tgUsername: verified.username,
        sessionKeySealed: seal(session.sk),
      });
      if (outcome === 'conflict') {
        return NextResponse.json(
          {
            error: 'This Telegram is already linked to another CallIt account',
            code: 'tg-already-bound',
          },
          { status: 409 },
        );
      }
      saveSession({ ...session, provider: 'telegram' });
      return NextResponse.json({
        session: jsonSafe({
          address: session.address,
          managerId: session.managerId,
          createdAt: session.createdAt,
        }),
        merged: false,
        linked: true,
        username: verified.username ?? null,
        airdroppedUnits: '0',
        airdropFailed: false,
      });
    }

    // ── no session, unknown tg id: brand-new TG-bound account ───────────
    const result = await createAccount({
      provider: 'telegram',
      tgChatId: verified.id,
      tgUsername: verified.username,
    });
    saveSession(result.session);
    return NextResponse.json({
      session: jsonSafe({
        address: result.session.address,
        managerId: result.session.managerId,
        createdAt: result.session.createdAt,
      }),
      merged: false,
      linked: true,
      username: verified.username ?? null,
      airdroppedUnits: result.airdroppedUnits.toString(),
      airdropFailed: result.airdropFailed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'telegram login failed' },
      { status: 500 },
    );
  }
}
