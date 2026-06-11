import { getDb, loadLedger, saveLedger } from '@callit/db';
import type { LedgerStore, MockLedgerStateJSON } from '@callit/core';
import { ledgerStoreFor as cookieStore } from './cookieLedger';

/**
 * Mock-ledger persistence: account-scoped in Postgres when available (the
 * same balance follows the user from web to the Telegram Mini App), sealed
 * cookie otherwise (keeps keyless deploys working).
 */
export function ledgerStore(): LedgerStore {
  const db = getDb();
  if (!db) return cookieStore();
  return {
    async load(userId: string): Promise<MockLedgerStateJSON | null> {
      return (await loadLedger(db, userId)) as MockLedgerStateJSON | null;
    },
    async save(userId: string, state: MockLedgerStateJSON): Promise<void> {
      await saveLedger(db, userId, state);
    },
  };
}
