-- D-15 account-system batch: additive users columns.
-- Run against Supabase BEFORE deploying the D-15 web/worker code — drizzle
-- selects every mapped column, so the new code 500s on a database that
-- doesn't have these yet. Safe to re-run (IF NOT EXISTS).
--
--   psql "$SUPABASE_SESSION_URL" -f scripts/d15-users-columns.sql
-- (use the session-mode port 5432 URL, not the :6543 pooler)

ALTER TABLE users ADD COLUMN IF NOT EXISTS tg_username text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_card_file_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_card_text text;
