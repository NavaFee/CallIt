import { NextResponse } from 'next/server';
import { marketSnapshot } from '@/lib/server/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// first cold fetch of the oracle list can crawl past Vercel's 10s default
export const maxDuration = 60;

export async function GET() {
  try {
    return NextResponse.json(await marketSnapshot());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'market snapshot failed' },
      { status: 503 },
    );
  }
}
