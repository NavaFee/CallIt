import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { socialLeaderboard, socialProfile } from '@/lib/server/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Seed personalities from the design prototype (design/js/engine.jsx
 * CI_BOT_SEED) so the board is never an empty wall. Real players and bots
 * share one PnL sort; bots are labeled as such in the UI.
 */
const BOT_SEED: Array<{ name: string; pnl: number; streak: number }> = [
  { name: 'OracleOtter', pnl: 212.4, streak: 4 },
  { name: 'VolVixen', pnl: 168.22, streak: 0 },
  { name: 'SuiSensei', pnl: 141.95, streak: 2 },
  { name: 'MoonCaller', pnl: 98.1, streak: 0 },
  { name: 'ThetaThief', pnl: 76.55, streak: 3 },
  { name: 'CandleCat', pnl: 61.04, streak: 0 },
  { name: 'GammaGoose', pnl: 44.8, streak: 0 },
  { name: 'BlockBird', pnl: 31.27, streak: 2 },
  { name: 'PumpPenguin', pnl: 19.6, streak: 0 },
  { name: 'DeltaDuck', pnl: 8.15, streak: 0 },
  { name: 'DipDolphin', pnl: -4.42, streak: 0 },
  { name: 'SatoshiSnail', pnl: -12.9, streak: 0 },
  { name: 'KeeperKoala', pnl: -27.35, streak: 0 },
  { name: 'TickTockTrader', pnl: -41.08, streak: 0 },
];

export interface BoardRow {
  userId: string;
  name: string | null;
  isBot: boolean;
  pnlUnits: string;
  wins: number;
  calls: number;
  streak: number;
}

export async function GET() {
  const session = getSession();
  const real = (await socialLeaderboard()) ?? [];

  const realRows: BoardRow[] = real.map((r) => ({
    userId: r.userId,
    name: null,
    isBot: false,
    pnlUnits: r.pnlUnits,
    wins: r.wins,
    calls: r.calls,
    streak: r.streak,
  }));
  if (session && !realRows.some((r) => r.userId === session.address)) {
    const stats = await socialProfile(session.address);
    if (stats && stats.calls > 0) {
      realRows.push({
        userId: session.address,
        name: null,
        isBot: false,
        pnlUnits: stats.netPnlUnits,
        wins: stats.wins,
        calls: stats.calls,
        streak: stats.streak.current,
      });
    }
  }
  const botRows: BoardRow[] = BOT_SEED.map((b) => ({
    userId: `bot:${b.name}`,
    name: b.name,
    isBot: true,
    pnlUnits: BigInt(Math.round(b.pnl * 1e6)).toString(),
    wins: 0,
    calls: 0,
    streak: b.streak,
  }));

  const byPnl = (a: BoardRow, b: BoardRow) => {
    const diff = BigInt(b.pnlUnits) - BigInt(a.pnlUnits);
    if (diff > 0n) return 1;
    if (diff < 0n) return -1;
    return a.isBot === b.isBot ? 0 : a.isBot ? 1 : -1;
  };
  const rows = [...realRows, ...botRows].sort(byPnl).slice(0, 50);

  return NextResponse.json({
    rows,
    you: session?.address ?? null,
    available: true,
  });
}
