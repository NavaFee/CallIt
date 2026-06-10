import { NextResponse } from 'next/server';
import { createBindCode, ensureUser, getDb } from '@callit/db';
import { getSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mint a Telegram deep-link binding code for the current session. */
export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const db = getDb();
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!db || !botUsername) {
    return NextResponse.json(
      { error: 'Telegram notifications are not configured on this deployment' },
      { status: 501 },
    );
  }
  await ensureUser(db, session.address, session.managerId);
  const code = await createBindCode(db, session.address);
  return NextResponse.json({ link: `https://t.me/${botUsername}?start=${code}` });
}
