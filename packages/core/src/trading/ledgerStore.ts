import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Serialized mock-ledger state. All bigints are decimal strings so the state
 * survives JSON round trips (file, cookie, or DB column).
 */
export interface MockLedgerStateJSON {
  balanceUnits: string;
  nonce: number;
  positions: Array<{
    id: string;
    oracleId: string;
    expiry: string;
    strike: string;
    isUp: boolean;
    quantityUnits: string;
    costUnits: string;
    askPrice: string;
    placedAt: number;
    status: 'open' | 'cashed_out' | 'won' | 'lost';
    payoutUnits?: string;
    settledAt?: number;
  }>;
}

export const EMPTY_LEDGER: MockLedgerStateJSON = {
  balanceUnits: '0',
  nonce: 0,
  positions: [],
};

/** Pluggable persistence for the mock ledger (file / cookie / DB). */
export interface LedgerStore {
  load(userId: string): Promise<MockLedgerStateJSON | null>;
  save(userId: string, state: MockLedgerStateJSON): Promise<void>;
}

export class MemoryLedgerStore implements LedgerStore {
  private readonly data = new Map<string, MockLedgerStateJSON>();

  async load(userId: string): Promise<MockLedgerStateJSON | null> {
    return this.data.get(userId) ?? null;
  }

  async save(userId: string, state: MockLedgerStateJSON): Promise<void> {
    this.data.set(userId, state);
  }
}

/** One JSON file per user under `dir` — used by the CLI and local dev. */
export class FileLedgerStore implements LedgerStore {
  constructor(private readonly dir: string) {}

  private fileFor(userId: string): string {
    // user ids are sui addresses / opaque ids; strip anything path-hostile
    return path.join(this.dir, `${userId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);
  }

  async load(userId: string): Promise<MockLedgerStateJSON | null> {
    try {
      return JSON.parse(readFileSync(this.fileFor(userId), 'utf8'));
    } catch {
      return null;
    }
  }

  async save(userId: string, state: MockLedgerStateJSON): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.fileFor(userId), JSON.stringify(state, null, 2));
  }
}
