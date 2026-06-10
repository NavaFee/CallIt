import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Db = PostgresJsDatabase<typeof schema>;

let cached: Db | null | undefined;

/**
 * Lazy DB handle. Returns null when DATABASE_URL is unset — the social
 * layer (streaks/leaderboard/badges) degrades gracefully and the betting
 * flow keeps working without it.
 */
export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    cached = null;
    return cached;
  }
  const client = postgres(url, { max: 5, prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}
