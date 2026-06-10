import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PredictIndexerClient } from './client.js';
import type { OracleRow } from './types.js';

/**
 * Disk-backed cache for the full-oracle-list endpoint.
 *
 * `/predicts/:id/oracles` returns every oracle ever created (~3,600 rows,
 * >2 MB) with response times observed anywhere between 2s and >90s on
 * testnet. The active set only changes when the protocol team deploys new
 * expiries (currently weekly), so we cache to disk with a TTL and fall back
 * to stale data when the indexer is slow or down — the per-oracle freshness
 * check in health.ts still guards actual trading.
 */
export class OracleCache {
  private memory: { fetchedAt: number; rows: OracleRow[] } | null = null;

  constructor(
    private readonly indexer: PredictIndexerClient,
    private readonly predictId: string,
    private readonly opts: { ttlMs?: number; cacheFile?: string } = {},
  ) {}

  private get ttlMs(): number {
    return this.opts.ttlMs ?? 10 * 60_000;
  }

  async getAll(): Promise<{ rows: OracleRow[]; stale: boolean }> {
    const now = Date.now();
    const cached = this.memory ?? this.readDisk();
    if (cached && now - cached.fetchedAt < this.ttlMs) {
      this.memory = cached;
      return { rows: cached.rows, stale: false };
    }
    try {
      const rows = await this.indexer.oracles(this.predictId);
      this.memory = { fetchedAt: now, rows };
      this.writeDisk(this.memory);
      return { rows, stale: false };
    } catch (err) {
      if (cached) {
        // serve stale rather than failing the whole flow
        this.memory = cached;
        return { rows: cached.rows, stale: true };
      }
      throw err;
    }
  }

  async getActive(): Promise<{ rows: OracleRow[]; stale: boolean }> {
    const { rows, stale } = await this.getAll();
    const active = rows
      .filter((o) => o.status === 'active' && Number(o.expiry) > Date.now())
      .sort((a, b) => Number(a.expiry) - Number(b.expiry));
    return { rows: active, stale };
  }

  private readDisk(): { fetchedAt: number; rows: OracleRow[] } | null {
    if (!this.opts.cacheFile) return null;
    try {
      const parsed = JSON.parse(readFileSync(this.opts.cacheFile, 'utf8'));
      if (Array.isArray(parsed.rows) && typeof parsed.fetchedAt === 'number') return parsed;
    } catch {
      // missing or corrupt cache — refetch
    }
    return null;
  }

  private writeDisk(data: { fetchedAt: number; rows: OracleRow[] }): void {
    if (!this.opts.cacheFile) return;
    try {
      mkdirSync(path.dirname(this.opts.cacheFile), { recursive: true });
      writeFileSync(this.opts.cacheFile, JSON.stringify(data));
    } catch {
      // cache write failures are non-fatal
    }
  }
}
