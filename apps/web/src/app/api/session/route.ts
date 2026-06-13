import { NextResponse } from 'next/server';
import { MOCK_FUNDS } from '@/lib/server/clients';
import { getSession, registerSession } from '@/lib/server/session';
import { tgLinkState, tgWidgetConfig } from '@/lib/server/tgState';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // registration runs two on-chain transactions

function publicSession(session: { address: string; managerId: string | null; createdAt: number }) {
  return {
    address: session.address,
    managerId: session.managerId,
    createdAt: session.createdAt,
    mockFunds: MOCK_FUNDS,
  };
}

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ session: null, tgWidget: tgWidgetConfig() });
  const port = tradingPortFor(session);
  const balanceUnits = await port.getBalance().catch(() => 0n);
  const tg = await tgLinkState(session);
  return NextResponse.json({
    session: publicSession(session),
    balanceUnits: balanceUnits.toString(),
    tgWidget: tgWidgetConfig(),
    tgLinked: tg.linked,
  });
}

/** Register: session wallet → sponsored manager → welcome airdrop. Idempotent. */
export async function POST() {
  try {
    const { session, airdroppedUnits, managerSkipped, airdropFailed } = await registerSession();
    const port = tradingPortFor(session);
    const balanceUnits = await port.getBalance().catch(() => 0n);
    return NextResponse.json({
      session: publicSession(session),
      airdroppedUnits: airdroppedUnits.toString(),
      balanceUnits: balanceUnits.toString(),
      managerSkipped,
      airdropFailed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'registration failed' },
      { status: 500 },
    );
  }
}
