import { NextResponse, type NextRequest } from 'next/server';
import { indexer } from '@/lib/server/clients';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sparkline seed: recent price prints, oldest first. */
export async function GET(req: NextRequest) {
  const oracleId = req.nextUrl.searchParams.get('oracleId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 90), 300);
  if (!oracleId) {
    return NextResponse.json({ error: 'oracleId required' }, { status: 400 });
  }
  try {
    const rows = await indexer.prices(oracleId, { limit });
    const points = rows
      .map((row) => ({ t: Number(row.onchain_timestamp), usd: Number(row.spot) / 1e9 }))
      .sort((a, b) => a.t - b.t);
    return NextResponse.json({ oracleId, points });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'prices failed' },
      { status: 503 },
    );
  }
}
