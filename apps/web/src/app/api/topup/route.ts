import { NextResponse, type NextRequest } from 'next/server';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { dusdcToUnits, transferDusdc, unitsToDusdc } from '@callit/core';
import { MOCK_FUNDS, cfg, suiClient } from '@/lib/server/clients';
import { getSession, saveSession } from '@/lib/server/session';
import { ledgerStore } from '@/lib/server/ledger';
import { getDb, getTopupAt, setTopupAt } from '@callit/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOPUP_DUSDC = Number(process.env.TOPUP_DUSDC ?? '5');
const DAY_MS = 24 * 3600_000;

/** Best-effort IP throttle (per warm instance — the cookie limit is the real gate). */
const ipLast = new Map<string, number>();

/**
 * Small daily refill for broke players: 5 dUSDC once per day per account
 * (sealed-cookie timestamp) and per IP (best effort). Auto-disables when the
 * ops pool falls below the alert line so the demo-day reserve stays intact.
 */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });

  const now = Date.now();
  // account-level limit first (DB — follows the account across web/Mini App),
  // sealed-cookie timestamp as the no-DB fallback, IP throttle last
  const db = getDb();
  const accountLast = db
    ? (await getTopupAt(db, session.address).catch(() => null))?.getTime() ?? null
    : null;
  const lastClaim = Math.max(accountLast ?? 0, session.lastTopupAt ?? 0);
  if (lastClaim && now - lastClaim < DAY_MS) {
    const hours = Math.ceil((DAY_MS - (now - lastClaim)) / 3600_000);
    return NextResponse.json(
      { error: `daily refill already claimed — next one in ~${hours}h` },
      { status: 429 },
    );
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipPrev = ipLast.get(ip);
  if (ipPrev && now - ipPrev < DAY_MS) {
    return NextResponse.json({ error: 'daily refill already claimed from this network' }, { status: 429 });
  }

  const amount = dusdcToUnits(TOPUP_DUSDC);
  try {
    if (MOCK_FUNDS) {
      const store = ledgerStore();
      const state = (await store.load(session.address)) ?? {
        balanceUnits: '0',
        nonce: 0,
        positions: [],
      };
      state.balanceUnits = (BigInt(state.balanceUnits) + amount).toString();
      await store.save(session.address, state);
    } else {
      const key = process.env.SPONSOR_KEY ?? process.env.OPS_WALLET_KEY;
      if (!key) return NextResponse.json({ error: 'refills unavailable' }, { status: 501 });
      const ops = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey);
      const opsAddr = ops.getPublicKey().toSuiAddress();
      const pool = BigInt(
        (await suiClient.getBalance({ owner: opsAddr, coinType: cfg.dusdcCoinType })).totalBalance,
      );
      const alertLine = dusdcToUnits(Number(process.env.OPS_ALERT_DUSDC ?? '400'));
      if (pool - amount < alertLine) {
        // pool is in its protected band — refills pause, registration reserve untouched
        return NextResponse.json(
          { error: 'the refill pool is refueling — ping us on Telegram and we’ll fund you by hand' },
          { status: 503 },
        );
      }
      await transferDusdc(suiClient, cfg, ops, session.address, amount);
    }

    ipLast.set(ip, now);
    saveSession({ ...session, lastTopupAt: now });
    if (db) await setTopupAt(db, session.address, new Date(now)).catch(() => {});
    return NextResponse.json({ amountUnits: amount.toString(), amount: unitsToDusdc(amount) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'refill failed' },
      { status: 500 },
    );
  }
}
