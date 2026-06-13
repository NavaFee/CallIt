import { NextResponse, type NextRequest } from 'next/server';
import { getDb, markSettlementsSeen } from '@callit/db';
import { getSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Advance the player's last-seen settlement marker after the revisit replay.
 * The client passes the newest settledAt it just replayed (ms epoch) so a
 * settlement landing between fetch and ack is never silently skipped.
 */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ ok: true });

  let body: { at?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const at = typeof body.at === 'number' && Number.isFinite(body.at) ? new Date(body.at) : new Date();
  await markSettlementsSeen(db, session.address, at).catch(() => {});
  return NextResponse.json({ ok: true });
}
