import { applyResult, earnedBadges, type ProfileStats } from '@callit/db';
import type { Position } from '@callit/core';

export function deriveStatsFromPositions(positions: Position[]): ProfileStats {
  const closed = positions
    .filter((p) => p.status !== 'open')
    .sort((a, b) => (a.settledAt ?? a.placedAt) - (b.settledAt ?? b.placedAt));

  let streak = { current: 0, best: 0 };
  let netPnl = 0n;
  let wins = 0;
  let losses = 0;
  let cashouts = 0;
  let maxStakeUnits = 0n;

  for (const p of positions) {
    if (p.costUnits > maxStakeUnits) maxStakeUnits = p.costUnits;
  }
  for (const p of closed) {
    netPnl += (p.payoutUnits ?? 0n) - p.costUnits;
    if (p.status === 'won') wins += 1;
    if (p.status === 'lost') losses += 1;
    if (p.status === 'cashed_out') cashouts += 1;
    streak = applyResult(streak, p.status as 'won' | 'lost' | 'cashed_out');
  }

  return {
    calls: positions.length,
    wins,
    losses,
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
