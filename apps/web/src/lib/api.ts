/** Typed client for the CallIt API routes. All bigints travel as strings. */

import type { MarketSnapshot, QuoteResponse } from './server/market';

export interface PublicSession {
  address: string;
  managerId: string | null;
  createdAt: number;
  mockFunds: boolean;
}

export interface PositionWire {
  id: string;
  market: { oracleId: string; expiry: string; strike: string; isUp: boolean };
  quantityUnits: string;
  costUnits: string;
  askPrice: string;
  placedAt: number;
  status: 'open' | 'cashed_out' | 'won' | 'lost';
  payoutUnits?: string;
  settledAt?: number;
  txDigest?: string;
}

export interface SettlementEventWire {
  position: PositionWire;
  settlementPrice: string;
  won: boolean;
  payoutUnits: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `${path} → ${res.status}`);
  return data;
}

export const api = {
  market: () => request<MarketSnapshot>('/api/market'),
  prices: (oracleId: string, limit = 90) =>
    request<{ points: Array<{ t: number; usd: number }> }>(
      `/api/prices?oracleId=${oracleId}&limit=${limit}`,
    ),
  quote: (oracleId: string, stakeUnits: string) =>
    request<QuoteResponse>(`/api/quote?oracleId=${oracleId}&stakeUnits=${stakeUnits}`),
  session: () => request<{ session: PublicSession | null; balanceUnits?: string }>('/api/session'),
  register: () =>
    request<{
      session: PublicSession;
      airdroppedUnits: string;
      balanceUnits: string;
      managerSkipped: boolean;
    }>('/api/session', { method: 'POST' }),
  airdrop: () => request<{ balanceUnits: string }>('/api/airdrop', { method: 'POST' }),
  bet: (body: { oracleId: string; side: 'up' | 'down'; stakeUnits: string; strike: string }) =>
    request<{
      position: PositionWire;
      balanceUnits: string;
      txDigest?: string;
      newBadges?: string[];
    }>('/api/bet', { method: 'POST', body: JSON.stringify(body) }),
  positions: () =>
    request<{ positions: PositionWire[]; balanceUnits: string }>('/api/positions'),
  cashout: (positionId: string) =>
    request<{
      position: PositionWire;
      payoutUnits: string;
      balanceUnits: string;
      txDigest?: string;
      social?: SocialResolution;
    }>('/api/cashout', { method: 'POST', body: JSON.stringify({ positionId }) }),
  settle: () =>
    request<{ events: SettlementEventWire[]; social?: SocialResolution[]; balanceUnits: string }>(
      '/api/settle',
      { method: 'POST' },
    ),
  leaderboard: () =>
    request<{
      rows: Array<{ userId: string; pnlUnits: string; wins: number; calls: number; streak: number }> | null;
      you: string | null;
      available: boolean;
    }>('/api/leaderboard'),
  profile: () =>
    request<{
      stats: {
        calls: number;
        wins: number;
        cashouts: number;
        netPnlUnits: string;
        streak: { current: number; best: number };
        badges: string[];
      } | null;
      available: boolean;
    }>('/api/profile'),
};

export interface SocialResolution {
  newBadges: string[];
  streak: { current: number; best: number } | null;
}
