import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { deriveStatsFromPositions } from '@/lib/server/profileStats';
import { socialProfile } from '@/lib/server/social';
import { tgLinkState } from '@/lib/server/tgState';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });

  const tg = await tgLinkState(session);
  const tgLinked = tg.linked;
  const tgUsername = tg.username;

  // Positions are the source of truth for what the play screen shows; derive
  // stats from them first so win rate / calls / P&L never contradict the HUD.
  try {
    const positions = await tradingPortFor(session).listPositions();
    return NextResponse.json({
      stats: deriveStatsFromPositions(positions),
      tgLinked,
      tgUsername,
      available: true,
    });
  } catch {}

  const dbStats = await socialProfile(session.address);
  if (dbStats) {
    return NextResponse.json({ stats: dbStats, tgLinked, tgUsername, available: true });
  }
  return NextResponse.json({ stats: null, tgLinked, tgUsername, available: false });
}
