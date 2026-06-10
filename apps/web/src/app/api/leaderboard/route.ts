import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { socialLeaderboard } from '@/lib/server/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Global weekly leaderboard (realized PnL). null rows = no DB configured. */
export async function GET() {
  const rows = await socialLeaderboard();
  const session = getSession();
  return NextResponse.json({
    rows,
    you: session?.address ?? null,
    available: rows !== null,
  });
}
