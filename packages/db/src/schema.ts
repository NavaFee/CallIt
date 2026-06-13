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
    /** @username captured at bind/login time — shown on the linked card */
    tgUsername: text('tg_username'),
    /** last settlement-card photo file_id — reused for inline group shares */
    lastCardFileId: text('last_card_file_id'),
    lastCardText: text('last_card_text'),
    /** AES-GCM-sealed session key — lets the same account open on web and
     * the Telegram Mini App (dev auth provider only; Enoki replaces this) */
    sessionKeySealed: text('session_key_sealed'),
    /** startapp referrer captured at signup (future invite rewards hook) */
    referrerId: text('referrer_id'),
    lastTopupAt: timestamp('last_topup_at'),
    /** most recent settlement the player has actually seen (server-authoritative
     * so the revisit replay survives cleared cookies and is device-consistent) */
    lastSeenSettlementAt: timestamp('last_seen_settlement_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_tg_chat_idx').on(t.tgChatId)],
);

/**
 * One-time bot-login nonces. The web mints one (POST /api/tg-login-start),
 * the player deep-links into the bot which binds the nonce to their (trusted,
 * message-derived) tg id, then the web polls and completes the login. TTL +
 * single-use are enforced in consumeLoginNonce.
 */
export const loginNonces = pgTable('login_nonces', {
  nonce: text('nonce').primaryKey(),
  /** the guest session that started the flow, for 'link' mode (nullable) */
  originAddress: text('origin_address'),
  mode: text('mode', { enum: ['login', 'link'] })
    .default('login')
    .notNull(),
  /** set by the bot (or the initData bind path) once the player authorises */
  tgChatId: bigint('tg_chat_id', { mode: 'number' }),
  tgUsername: text('tg_username'),
  consumed: boolean('consumed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
