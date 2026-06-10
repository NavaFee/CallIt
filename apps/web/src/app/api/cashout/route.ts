import { NextResponse, type NextRequest } from 'next/server';
import { jsonSafe } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  let body: { positionId?: string };
  try {
    body = (await req.json()) as { positionId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.positionId) {
    return NextResponse.json({ error: 'positionId required' }, { status: 400 });
  }
  try {
    const port = tradingPortFor(session);
    const receipt = await port.cashOut(body.positionId);
    return NextResponse.json(jsonSafe(receipt));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cashout failed';
    const status = /no open position|no on-chain quantity/.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
