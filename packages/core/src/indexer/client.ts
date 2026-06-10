import type {
  IndexerStatus,
  ManagerRow,
  OraclePriceRow,
  OracleRow,
  OracleStateResponse,
  PositionMintedRow,
  PositionRedeemedRow,
} from './types.js';

export class IndexerError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message);
    this.name = 'IndexerError';
  }
}

export interface IndexerClientOptions {
  /** Per-request timeout. The UI treats a timeout as a health-fuse signal. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Thin typed client for the public predict-server REST API.
 * Read-only; used for rendering lists/history. Confirmation-critical reads
 * go straight to chain (see PredictService).
 */
export class PredictIndexerClient {
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    readonly baseUrl: string,
    opts: IndexerClientOptions = {},
  ) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    timeoutMs?: number,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { signal: controller.signal });
      if (!res.ok) {
        throw new IndexerError(`indexer responded ${res.status}`, res.status, url.toString());
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof IndexerError) throw err;
      const reason = err instanceof Error ? err.message : String(err);
      throw new IndexerError(`indexer request failed: ${reason}`, undefined, url.toString());
    } finally {
      clearTimeout(timer);
    }
  }

  status(): Promise<IndexerStatus> {
    return this.get('/status');
  }

  /**
   * Full oracle list. Heavy: the server returns every oracle ever created
   * (~3,600 rows / >2 MB on testnet, no server-side filtering) and can take
   * tens of seconds — hence the dedicated timeout. Cache aggressively.
   */
  oracles(predictId: string): Promise<OracleRow[]> {
    return this.get(`/predicts/${predictId}/oracles`, undefined, 90_000);
  }

  /** Active oracles sorted by expiry ascending (soonest first). */
  async activeOracles(predictId: string): Promise<OracleRow[]> {
    const all = await this.oracles(predictId);
    return all
      .filter((o) => o.status === 'active')
      .sort((a, b) => Number(a.expiry) - Number(b.expiry));
  }

  oracleState(oracleId: string): Promise<OracleStateResponse> {
    return this.get(`/oracles/${oracleId}/state`);
  }

  /** Recent price prints for one oracle, newest first. */
  prices(oracleId: string, params?: { limit?: number }): Promise<OraclePriceRow[]> {
    return this.get(`/oracles/${oracleId}/prices`, params);
  }

  quoteAssets(predictId: string): Promise<string[]> {
    return this.get(`/predicts/${predictId}/quote-assets`);
  }

  managers(params?: { owner?: string; limit?: number }): Promise<ManagerRow[]> {
    return this.get('/managers', params);
  }

  managerSummary(managerId: string): Promise<unknown> {
    return this.get(`/managers/${managerId}/summary`);
  }

  positionsSummary(managerId: string): Promise<unknown> {
    return this.get(`/managers/${managerId}/positions/summary`);
  }

  positionsMinted(params?: {
    manager_id?: string;
    oracle_id?: string;
    limit?: number;
  }): Promise<PositionMintedRow[]> {
    return this.get('/positions/minted', params);
  }

  positionsRedeemed(params?: {
    manager_id?: string;
    oracle_id?: string;
    limit?: number;
  }): Promise<PositionRedeemedRow[]> {
    return this.get('/positions/redeemed', params);
  }
}
