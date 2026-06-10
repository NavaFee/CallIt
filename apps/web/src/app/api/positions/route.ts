import { NextResponse } from 'next/server';
import { jsonSafe, predictService } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  try {
    const port = tradingPortFor(session);
    const [positions, balanceUnits] = await Promise.all([
      port.listPositions(),
      port.getBalance(),
    ]);
    // live exit value for open positions (protocol bid via devInspect)
    const enriched = await Promise.all(
      positions.map(async (p) => {
        if (p.status !== 'open' || Number(p.market.expiry) <= Date.now()) {
          return { ...p, cashoutUnits: null };
        }
        const cashoutUnits = await predictService
          .getTradeAmounts(p.market, p.quantityUnits)
          .then((q) => q.redeemPayout)
          .catch(() => null);
        return { ...p, cashoutUnits };
      }),
    );
    return NextResponse.json({
      positions: jsonSafe(enriched),
      balanceUnits: balanceUnits.toString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'positions failed' },
      { status: 500 },
    );
  }
}
