import {
  afterPick,
  ensureUser,
  getDb,
  profileStats,
  recordPick,
  resolvePick,
  weeklyLeaderboard,
  type BadgeType,
  type PickResult,
  type ProfileStats,
} from '@callit/db';
import type { Position } from '@callit/core';

/**
 * Social-layer glue for the API routes. Every call no-ops gracefully when
 * DATABASE_URL is unset — chain custody never depends on Postgres.
 */

export async function socialRecordBet(
  userId: string,
  managerId: string | null,
  position: Position,
  txDigest?: string,
): Promise<BadgeType[]> {
  const db = getDb();
  if (!db) return [];
  try {
    await ensureUser(db, userId, managerId);
    await recordPick(db, {
      id: position.id,
      userId,
      oracleId: position.market.oracleId,
      isUp: position.market.isUp,
      strike: position.market.strike,
      expiryMs: Number(position.market.expiry),
      quantityUnits: position.quantityUnits,
      costUnits: position.costUnits,
      quotedAsk: position.askPrice,
      txDigest,
    });
    return await afterPick(db, userId);
  } catch (err) {
    console.error('social recordBet failed:', err);
    return [];
  }
}

export interface SocialResolution {
  /** true iff THIS call transitioned the pick from open — the DM gate */
  resolved: boolean;
  newBadges: BadgeType[];
  streak: { current: number; best: number } | null;
}

export async function socialResolve(
  pickId: string,
  result: PickResult,
  payoutUnits: bigint,
): Promise<SocialResolution> {
  const db = getDb();
  if (!db) return { resolved: false, newBadges: [], streak: null };
  try {
    const res = await resolvePick(db, { pickId, result, payoutUnits });
    return { resolved: res !== null, newBadges: res?.newBadges ?? [], streak: res?.streak ?? null };
  } catch (err) {
    console.error('social resolve failed:', err);
    return { resolved: false, newBadges: [], streak: null };
  }
}

export async function socialLeaderboard() {
  const db = getDb();
  if (!db) return null;
  try {
    return await weeklyLeaderboard(db);
  } catch (err) {
    console.error('social leaderboard failed:', err);
    return null;
  }
}

export async function socialProfile(userId: string): Promise<ProfileStats | null> {
  const db = getDb();
  if (!db) return null;
  try {
    return await profileStats(db, userId);
  } catch (err) {
    console.error('social profile failed:', err);
    return null;
  }
}
