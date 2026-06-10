import { NextResponse } from 'next/server';
import { jsonSafe } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { socialResolve } from '@/lib/server/social';
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
      social.push(
        await socialResolve(event.position.id, event.won ? 'won' : 'lost', event.payoutUnits),
      );
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
