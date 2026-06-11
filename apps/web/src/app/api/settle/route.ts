import { NextResponse } from 'next/server';
import { jsonSafe } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { socialResolve } from '@/lib/server/social';
import { notifySettlementDM } from '@/lib/server/tgNotify';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Apply oracle settlements to this session's open positions (mock mode:
 * computes payouts from the real on-chain settlement price; real mode:
 * no-op — the keeper claims via redeem_permissionless). The client polls
 * this after an expiry passes to drive the celebration overlay.
 */
export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  try {
    const port = tradingPortFor(session);
    const events = await port.settle();
    const social = [];
    for (const event of events) {
      const resolution = await socialResolve(
        event.position.id,
        event.won ? 'won' : 'lost',
        event.payoutUnits,
      );
      social.push(resolution);
      // DM exactly once: only the caller that flipped the pick sends it
      if (resolution.resolved) {
        await notifySettlementDM(session.address, {
          won: event.won,
          payoutDusdc: Number(event.payoutUnits) / 1e6,
          costDusdc: Number(event.position.costUnits) / 1e6,
          isUp: event.position.market.isUp,
          strikeUsd: Number(event.position.market.strike) / 1e9,
          settleUsd: Number(event.settlementPrice) / 1e9,
          streak: resolution.streak?.current ?? 0,
        });
      }
    }
    return NextResponse.json({
      events: jsonSafe(events),
      social,
      balanceUnits: (await port.getBalance()).toString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'settle failed' },
      { status: 500 },
    );
  }
}
