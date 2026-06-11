import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Social layer only. Chain custody (funds, positions) is the source of
 * truth; everything here can be rebuilt by replaying PositionMinted /
 * PositionRedeemed / OracleSettled events. Architecture doc §5.
 */

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // session/zkLogin sui address
    managerId: text('manager_id'),
    tgChatId: bigint('tg_chat_id', { mode: 'number' }),
    tgBindCode: text('tg_bind_code'),
    /** AES-GCM-sealed session key — lets the same account open on web and
     * the Telegram Mini App (dev auth provider only; Enoki replaces this) */
    sessionKeySealed: text('session_key_sealed'),
    /** startapp referrer captured at signup (future invite rewards hook) */
    referrerId: text('referrer_id'),
    lastTopupAt: timestamp('last_topup_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_tg_chat_idx').on(t.tgChatId)],
);

export const picks = pgTable(
  'picks',
  {
    id: text('id').primaryKey(), // position id (oracle:strike:dir[:nonce])
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    oracleId: text('oracle_id').notNull(),
    isUp: boolean('is_up').notNull(),
    strike: bigint('strike', { mode: 'bigint' }).notNull(), // 1e9 fixed
    expiryMs: bigint('expiry_ms', { mode: 'number' }).notNull(),
    quantityUnits: bigint('quantity_units', { mode: 'bigint' }).notNull(),
    costUnits: bigint('cost_units', { mode: 'bigint' }).notNull(),
    quotedAsk: bigint('quoted_ask', { mode: 'bigint' }).notNull(),
    txDigest: text('tx_digest'),
    status: text('status', { enum: ['open', 'cashed_out', 'won', 'lost'] })
      .default('open')
      .notNull(),
    payoutUnits: bigint('payout_units', { mode: 'bigint' }),
    placedAt: timestamp('placed_at').defaultNow().notNull(),
    settledAt: timestamp('settled_at'),
  },
  (t) => [index('picks_user_idx').on(t.userId), index('picks_status_idx').on(t.status)],
);

export const streaks = pgTable('streaks', {
  userId: text('user_id')
    .references(() => users.id)
    .primaryKey(),
  current: integer('current').default(0).notNull(),
  best: integer('best').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const badges = pgTable(
  'badges',
  {
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    type: text('type').notNull(),
    nftObjectId: text('nft_object_id'),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('badges_user_type_idx').on(t.userId, t.type)],
);

/** Mock-ledger state per account — shared across web and Mini App sessions. */
export const ledgers = pgTable('ledgers', {
  userId: text('user_id')
    .references(() => users.id)
    .primaryKey(),
  state: jsonb('state').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
