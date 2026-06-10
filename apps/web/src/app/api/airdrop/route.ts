import { NextResponse } from 'next/server';
import { dusdcToUnits } from '@callit/core';
import { MOCK_FUNDS } from '@/lib/server/clients';
import { getSession, WELCOME_DUSDC } from '@/lib/server/session';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Faucet top-up. Mock mode only refills when nearly empty (anti-grind). */
export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  if (!MOCK_FUNDS) {
    return NextResponse.json(
      { error: 'real airdrops are dispatched by the ops wallet service' },
      { status: 501 },
    );
  }
  const port = tradingPortFor(session);
  const balance = await port.getBalance();
  if (balance >= dusdcToUnits(5)) {
    return NextResponse.json(
      { error: 'faucet unlocks when your balance drops below 5 dUSDC' },
      { status: 429 },
    );
  }
  await port.airdrop(dusdcToUnits(WELCOME_DUSDC));
  return NextResponse.json({ balanceUnits: (await port.getBalance()).toString() });
}
