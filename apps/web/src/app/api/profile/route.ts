import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { socialProfile } from '@/lib/server/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const stats = await socialProfile(session.address);
  return NextResponse.json({ stats, available: stats !== null });
}
