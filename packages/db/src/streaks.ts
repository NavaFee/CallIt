/**
 * Streak state machine + badge rules — pure functions, unit-tested.
 * Rules from the design prototype (design/js/engine.jsx):
 * win → streak+1, loss → 0, cash-out → unchanged.
 */

export interface StreakState {
  current: number;
  best: number;
}

export type PickResult = 'won' | 'lost' | 'cashed_out';

export function applyResult(state: StreakState, result: PickResult): StreakState {
  if (result === 'cashed_out') return state;
  if (result === 'lost') return { current: 0, best: state.best };
  const current = state.current + 1;
  return { current, best: Math.max(current, state.best) };
}

/** Streak flame tier for UI (0..3), per design StreakFlame component. */
export function flameTier(streak: number): number {
  if (streak >= 7) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export interface BadgeStats {
  calls: number;
  wins: number;
  cashouts: number;
  bestStreak: number;
  /** largest single premium, 1e6 units */
  maxStakeUnits: bigint;
}

export const BADGES = [
  { type: 'first', name: 'First Call', description: 'Place your first call', glyph: '▲' },
  { type: 'hat', name: 'Hat Trick', description: 'Win 3 in a row', glyph: '3×' },
  { type: 'fire', name: 'On Fire', description: 'Hit a 5-win streak', glyph: '5×' },
  { type: 'exit', name: 'Smooth Exit', description: 'Cash out a live call', glyph: '⤴' },
  { type: 'whale', name: 'High Roller', description: 'Stake 25 dUSDC at once', glyph: '◆' },
  { type: 'sharp', name: 'Sharp Caller', description: 'Win 10 calls total', glyph: '★' },
] as const;

export type BadgeType = (typeof BADGES)[number]['type'];

export function earnedBadges(stats: BadgeStats): BadgeType[] {
  const earned: BadgeType[] = [];
  if (stats.calls >= 1) earned.push('first');
  if (stats.bestStreak >= 3) earned.push('hat');
  if (stats.bestStreak >= 5) earned.push('fire');
  if (stats.cashouts >= 1) earned.push('exit');
  // sizing trims cost a hair under the chip value; 24.5+ ≈ the $25 chip
  if (stats.maxStakeUnits >= 24_500_000n) earned.push('whale');
  if (stats.wins >= 10) earned.push('sharp');
  return earned;
}

/** ISO week key like "2026-W24" for the weekly leaderboard. */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
