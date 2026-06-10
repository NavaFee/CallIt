import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { badges, picks, streaks, users } from './schema.js';
import { applyResult, earnedBadges, type BadgeType, type PickResult } from './streaks.js';

/**
 * Social-layer operations shared by the web API and the keeper/bot worker.
 * All functions are no-ops (or empty results) when db is null so the app
 * runs without Postgres.
 */

export async function ensureUser(db: Db, userId: string, managerId: string | null): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, managerId })
    .onConflictDoUpdate({ target: users.id, set: { managerId: managerId ?? sql`users.manager_id` } });
}

export interface PickInput {
  id: string;
  userId: string;
  oracleId: string;
  isUp: boolean;
  strike: bigint;
  expiryMs: number;
  quantityUnits: bigint;
  costUnits: bigint;
  quotedAsk: bigint;
  txDigest?: string;
}

export async function recordPick(db: Db, pick: PickInput): Promise<void> {
  await db.insert(picks).values(pick).onConflictDoNothing();
}

export interface SettleInput {
  pickId: string;
  result: PickResult;
  payoutUnits: bigint;
}

/** Settle/cash-out a pick: update status, streak machine, and badge set. */
export async function resolvePick(
  db: Db,
  input: SettleInput,
): Promise<{ newBadges: BadgeType[]; streak: { current: number; best: number } } | null> {
  const [pick] = await db.select().from(picks).where(eq(picks.id, input.pickId)).limit(1);
  if (!pick || pick.status !== 'open') return null;

  await db
    .update(picks)
    .set({ status: input.result, payoutUnits: input.payoutUnits, settledAt: new Date() })
    .where(eq(picks.id, input.pickId));

  // streak machine
  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, pick.userId)).limit(1);
  const next = applyResult(
    { current: existing?.current ?? 0, best: existing?.best ?? 0 },
    input.result,
  );
  await db
    .insert(streaks)
    .values({ userId: pick.userId, current: next.current, best: next.best, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: streaks.userId,
      set: { current: next.current, best: next.best, updatedAt: new Date() },
    });

  const newBadges = await refreshBadges(db, pick.userId, next.best);
  return { newBadges, streak: next };
}

async function refreshBadges(db: Db, userId: string, bestStreak: number): Promise<BadgeType[]> {
  const [stats] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${picks.status} = 'won')::int`,
      cashouts: sql<number>`count(*) filter (where ${picks.status} = 'cashed_out')::int`,
      maxStake: sql<string>`coalesce(max(${picks.costUnits}), 0)::text`,
    })
    .from(picks)
    .where(eq(picks.userId, userId));

  const earned = earnedBadges({
    calls: stats?.calls ?? 0,
    wins: stats?.wins ?? 0,
    cashouts: stats?.cashouts ?? 0,
    bestStreak,
    maxStakeUnits: BigInt(stats?.maxStake ?? '0'),
  });

  const have = new Set(
    (await db.select({ type: badges.type }).from(badges).where(eq(badges.userId, userId))).map(
      (b) => b.type,
    ),
  );
  const fresh = earned.filter((t) => !have.has(t));
  if (fresh.length > 0) {
    await db
      .insert(badges)
      .values(fresh.map((type) => ({ userId, type })))
      .onConflictDoNothing();
  }
  return fresh;
}

/** First-call badge check at bet time (doesn't need a settlement). */
export async function afterPick(db: Db, userId: string): Promise<BadgeType[]> {
  const [s] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  return refreshBadges(db, userId, s?.best ?? 0);
}

export interface LeaderboardRow {
  userId: string;
  pnlUnits: string;
  wins: number;
  calls: number;
  streak: number;
}

/** Global weekly leaderboard: realized PnL since the start of the ISO week. */
export async function weeklyLeaderboard(db: Db, limit = 50): Promise<LeaderboardRow[]> {
  const monday = new Date();
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  monday.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      userId: picks.userId,
      pnlUnits: sql<string>`sum(coalesce(${picks.payoutUnits}, 0) - ${picks.costUnits})::text`,
      wins: sql<number>`count(*) filter (where ${picks.status} = 'won')::int`,
      calls: sql<number>`count(*)::int`,
      streak: sql<number>`coalesce(max(${streaks.current}), 0)::int`,
    })
    .from(picks)
    .leftJoin(streaks, eq(streaks.userId, picks.userId))
    .where(and(gte(picks.placedAt, monday), sql`${picks.status} != 'open'`))
    .groupBy(picks.userId)
    .orderBy(desc(sql`sum(coalesce(${picks.payoutUnits}, 0) - ${picks.costUnits})`))
    .limit(limit);
  return rows;
}

export interface ProfileStats {
  calls: number;
  wins: number;
  cashouts: number;
  netPnlUnits: string;
  streak: { current: number; best: number };
  badges: string[];
}

export async function profileStats(db: Db, userId: string): Promise<ProfileStats> {
  const [agg] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${picks.status} = 'won')::int`,
      cashouts: sql<number>`count(*) filter (where ${picks.status} = 'cashed_out')::int`,
      pnl: sql<string>`coalesce(sum(coalesce(${picks.payoutUnits}, 0) - ${picks.costUnits}) filter (where ${picks.status} != 'open'), 0)::text`,
    })
    .from(picks)
    .where(eq(picks.userId, userId));
  const [s] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  const earned = await db.select({ type: badges.type }).from(badges).where(eq(badges.userId, userId));
  return {
    calls: agg?.calls ?? 0,
    wins: agg?.wins ?? 0,
    cashouts: agg?.cashouts ?? 0,
    netPnlUnits: agg?.pnl ?? '0',
    streak: { current: s?.current ?? 0, best: s?.best ?? 0 },
    badges: earned.map((b) => b.type),
  };
}

// ── Telegram binding ──────────────────────────────────────────────────

export async function createBindCode(db: Db, userId: string): Promise<string> {
  const code = Math.random().toString(36).slice(2, 10);
  await db.update(users).set({ tgBindCode: code }).where(eq(users.id, userId));
  return code;
}

export async function bindTelegram(db: Db, code: string, chatId: number): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.tgBindCode, code)).limit(1);
  if (!user) return null;
  await db
    .update(users)
    .set({ tgChatId: chatId, tgBindCode: null })
    .where(eq(users.id, user.id));
  return user.id;
}

export async function chatIdFor(db: Db, userId: string): Promise<number | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user?.tgChatId ?? null;
}
