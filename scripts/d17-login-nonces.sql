-- D-17 Batch B: bot one-click login nonces + revisit-replay marker.
-- Run against Supabase BEFORE deploying the B web/worker code — drizzle
-- selects every mapped column, and the bot/poll/unseen routes hit the new
-- table, so the new code errors on a database that lacks them. Re-runnable.
--
--   psql "$SUPABASE_SESSION_URL" -f scripts/d17-login-nonces.sql
-- (use the session-mode port 5432 URL, not the :6543 pooler)

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_settlement_at timestamp;

CREATE TABLE IF NOT EXISTS login_nonces (
  nonce          text PRIMARY KEY,
  origin_address text,
  mode           text NOT NULL DEFAULT 'login',
  tg_chat_id     bigint,
  tg_username    text,
  consumed       boolean NOT NULL DEFAULT false,
  created_at     timestamp NOT NULL DEFAULT now()
);
