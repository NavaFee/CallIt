import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { badges, ledgers, picks, streaks, users } from './schema.js';
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

/** Reverse lookup for the keeper: PredictManager id → CallIt user id. */
export async function userByManagerId(db: Db, managerId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.managerId, managerId)).limit(1);
  return user?.id ?? null;
}

// ── Mini App account continuity ───────────────────────────────────────

export interface AccountRow {
  id: string;
  managerId: string | null;
  sessionKeySealed: string | null;
  tgChatId: number | null;
  lastTopupAt: Date | null;
}

export async function userByTgId(db: Db, tgId: number): Promise<AccountRow | null> {
  const [row] = await db.select().from(users).where(eq(users.tgChatId, tgId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    managerId: row.managerId,
    sessionKeySealed: row.sessionKeySealed,
    tgChatId: row.tgChatId,
    lastTopupAt: row.lastTopupAt,
  };
}

/** Full account upsert used at registration (web or Mini App). */
export async function upsertAccount(
  db: Db,
  account: {
    id: string;
    managerId: string | null;
    tgChatId?: number;
    sessionKeySealed?: string;
    referrerId?: string;
  },
): Promise<void> {
  await db
    .insert(users)
    .values(account)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        managerId: account.managerId,
        ...(account.tgChatId !== undefined ? { tgChatId: account.tgChatId } : {}),
        ...(account.sessionKeySealed !== undefined
          ? { sessionKeySealed: account.sessionKeySealed }
          : {}),
      },
    });
}

export async function getTopupAt(db: Db, userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: users.lastTopupAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.at ?? null;
}

export async function setTopupAt(db: Db, userId: string, at: Date): Promise<void> {
  await db.update(users).set({ lastTopupAt: at }).where(eq(users.id, userId));
}

// ── DB-backed mock ledger (account-scoped, device-independent) ────────

export async function loadLedger(db: Db, userId: string): Promise<unknown | null> {
  const [row] = await db.select().from(ledgers).where(eq(ledgers.userId, userId)).limit(1);
  return row?.state ?? null;
}

export async function saveLedger(db: Db, userId: string, state: unknown): Promise<void> {
  await db
    .insert(ledgers)
    .values({ userId, state, updatedAt: new Date() })
    .onConflictDoUpdate({ target: ledgers.userId, set: { state, updatedAt: new Date() } });
}

/** Detach a tg id from a legacy row (unusable key) so it can re-register. */
export async function clearTgBinding(db: Db, tgId: number): Promise<void> {
  await db.update(users).set({ tgChatId: null }).where(eq(users.tgChatId, tgId));
}

/** All mock ledgers — scanned by the worker's mock settler. */
export async function allLedgers(db: Db): Promise<Array<{ userId: string; state: unknown }>> {
  const rows = await db.select().from(ledgers);
  return rows.map((r) => ({ userId: r.userId, state: r.state }));
}
