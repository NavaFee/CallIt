import { NextResponse, type NextRequest } from 'next/server';
import type { MarketParams } from '@callit/core';
import { indexer, jsonSafe } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { socialRecordBet } from '@/lib/server/social';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // real mode runs an on-chain PTB

interface BetBody {
  oracleId: string;
  side: 'up' | 'down';
  stakeUnits: string;
  /** 1e9-fixed strike the user saw; server re-validates against the grid */
  strike: string;
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });

  let body: BetBody;
  try {
    body = (await req.json()) as BetBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.oracleId || !body.strike || (body.side !== 'up' && body.side !== 'down')) {
    return NextResponse.json({ error: 'oracleId, strike and side required' }, { status: 400 });
  }

  try {
    const { oracle } = await indexer.oracleState(body.oracleId);
    const strike = BigInt(body.strike);
    const min = BigInt(oracle.min_strike);
    const tick = BigInt(oracle.tick_size);
    if (strike < min || (strike - min) % tick !== 0n) {
      return NextResponse.json({ error: 'strike is off the oracle grid' }, { status: 400 });
    }
    const market: MarketParams = {
      oracleId: body.oracleId,
      expiry: BigInt(oracle.expiry),
      strike,
      isUp: body.side === 'up',
    };
    const port = tradingPortFor(session);
    const receipt = await port.placeBet({ market, stakeUnits: BigInt(body.stakeUnits) });
    const newBadges = await socialRecordBet(
      session.address,
      session.managerId,
      receipt.position,
      receipt.txDigest,
    );
    return NextResponse.json({ ...(jsonSafe(receipt) as object), newBadges });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bet failed';
    const status = /not tradeable|insufficient|too small/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
