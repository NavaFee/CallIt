import { NextResponse, type NextRequest } from 'next/server';
import { quoteBothSides } from '@/lib/server/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const oracleId = req.nextUrl.searchParams.get('oracleId');
  const stake = req.nextUrl.searchParams.get('stakeUnits') ?? '10000000';
  if (!oracleId) {
    return NextResponse.json({ error: 'oracleId required' }, { status: 400 });
  }
  try {
    return NextResponse.json(await quoteBothSides(oracleId, BigInt(stake)));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'quote failed' },
      { status: 503 },
    );
  }
}
