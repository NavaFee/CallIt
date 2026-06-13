import { NextResponse } from 'next/server';
import { getDb, unseenSettlements } from '@callit/db';
import { getSession } from '@/lib/server/session';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Auto-settled calls (won/lost) that resolved while the player was away, for
 * the revisit replay. "Seen" is server-authoritative (users.last_seen_*), so
 * the replay is device-consistent and survives cleared cookies.
 */
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ settlements: [], balanceUnits: '0' });

  const settlements = await unseenSettlements(db, session.address).catch(() => []);
  const balanceUnits = await tradingPortFor(session)
    .getBalance()
    .then((b) => b.toString())
    .catch(() => '0');
  return NextResponse.json({ settlements, balanceUnits });
}
