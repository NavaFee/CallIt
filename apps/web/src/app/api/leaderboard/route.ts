import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { socialLeaderboard } from '@/lib/server/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Seed personalities from the design prototype (design/js/engine.jsx
 * CI_BOT_SEED) so the board is never an empty wall. Real players always
 * rank above the bots; bots are labeled as such in the UI.
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
  const botRows: BoardRow[] = BOT_SEED.map((b) => ({
    userId: `bot:${b.name}`,
    name: b.name,
    isBot: true,
    pnlUnits: BigInt(Math.round(b.pnl * 1e6)).toString(),
    wins: 0,
    calls: 0,
    streak: b.streak,
  }));

  // real players first (sorted by PnL), bots fill out the board below
  const byPnl = (a: BoardRow, b: BoardRow) => Number(BigInt(b.pnlUnits) - BigInt(a.pnlUnits));
  const rows = [...realRows.sort(byPnl), ...botRows.sort(byPnl)].slice(0, 50);

  return NextResponse.json({
    rows,
    you: session?.address ?? null,
    available: true,
  });
}
