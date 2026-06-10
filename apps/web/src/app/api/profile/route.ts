import { NextResponse } from 'next/server';
import { applyResult, earnedBadges } from '@callit/db';
import type { Position } from '@callit/core';
import { getSession } from '@/lib/server/session';
import { socialProfile } from '@/lib/server/social';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });

  const dbStats = await socialProfile(session.address);
  if (dbStats) {
    return NextResponse.json({ stats: dbStats, available: true });
  }

  // No database: derive the same stats from the session's positions so the
  // profile never contradicts the play screen, whatever the deployment.
  try {
    const positions = await tradingPortFor(session).listPositions();
    return NextResponse.json({ stats: deriveStats(positions), available: true });
  } catch {
    return NextResponse.json({ stats: null, available: false });
  }
}

function deriveStats(positions: Position[]) {
  const closed = positions
    .filter((p) => p.status !== 'open')
    .sort((a, b) => (a.settledAt ?? a.placedAt) - (b.settledAt ?? b.placedAt));

  let streak = { current: 0, best: 0 };
  let netPnl = 0n;
  let wins = 0;
  let cashouts = 0;
  let maxStakeUnits = 0n;

  for (const p of positions) {
    if (p.costUnits > maxStakeUnits) maxStakeUnits = p.costUnits;
  }
  for (const p of closed) {
    netPnl += (p.payoutUnits ?? 0n) - p.costUnits;
    if (p.status === 'won') wins += 1;
    if (p.status === 'cashed_out') cashouts += 1;
    streak = applyResult(streak, p.status as 'won' | 'lost' | 'cashed_out');
  }

  return {
    calls: positions.length,
    wins,
    cashouts,
    netPnlUnits: netPnl.toString(),
    streak,
    badges: earnedBadges({
      calls: positions.length,
      wins,
      cashouts,
      bestStreak: streak.best,
      maxStakeUnits,
    }),
  };
}
