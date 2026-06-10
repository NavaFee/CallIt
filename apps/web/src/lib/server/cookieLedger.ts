import { cookies } from 'next/headers';
import type { LedgerStore, MockLedgerStateJSON } from '@callit/core';
import { seal, unseal } from './seal';

/**
 * Mock-ledger persistence in a sealed cookie — keeps the MOCK_FUNDS deploy
 * stateless (works on Vercel without a database). Replaced by the Postgres
 * store when the social layer lands; the LedgerStore interface is the seam.
 *
 * Cookies cap at ~4 KB, so closed positions are trimmed to the most recent
 * dozen; open positions are always kept.
 */
const LEDGER_COOKIE = 'callit_ledger';
const MAX_CLOSED_POSITIONS = 12;

export function ledgerStoreFor(): LedgerStore {
  return {
    async load(): Promise<MockLedgerStateJSON | null> {
      const raw = cookies().get(LEDGER_COOKIE)?.value;
      if (!raw) return null;
      return unseal<MockLedgerStateJSON>(raw);
    },
    async save(_userId: string, state: MockLedgerStateJSON): Promise<void> {
      const open = state.positions.filter((p) => p.status === 'open');
      const closed = state.positions
        .filter((p) => p.status !== 'open')
        .sort((a, b) => (b.settledAt ?? b.placedAt) - (a.settledAt ?? a.placedAt))
        .slice(0, MAX_CLOSED_POSITIONS);
      const trimmed: MockLedgerStateJSON = { ...state, positions: [...open, ...closed] };
      cookies().set(LEDGER_COOKIE, seal(trimmed), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 90,
        path: '/',
      });
    },
  };
}
