'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MarketSnapshot, QuoteResponse } from '@/lib/server/market';
import { expiryCountdown, fmtUsd } from '@/lib/format';

/** Hero teaser strip fed by real chain data: spot, next expiry, live odds. */
export function LiveTeaser() {
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const snap = await api.market();
        if (!alive) return;
        setMarket(snap);
        const oracle = snap.oracles.find((o) => o.tradeable);
        if (oracle) {
          const q = await api.quote(oracle.oracleId, '10000000');
          if (alive) setQuote(q);
        }
      } catch {
        // landing page stays calm if the indexer hiccups
      }
    };
    load();
    const t = setInterval(load, 8_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const oracle = market?.oracles.find((o) => o.tradeable) ?? market?.oracles[0] ?? null;

  return (
    <div
      className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4 rounded-3xl border border-line px-7 py-5"
      style={{ background: 'linear-gradient(180deg, #1A2133, #141927)' }}
    >
      <div>
        <div className="text-[9px] font-black tracking-[0.12em] text-muted">BTC · LIVE</div>
        <div className="num font-display text-[27px]">
          {oracle?.spotUsd ? `$${fmtUsd(oracle.spotUsd, 0)}` : '—'}
        </div>
      </div>
      <div className="hidden h-10 w-px bg-line sm:block" />
      <div>
        <div className="text-[9px] font-black tracking-[0.12em] text-muted">NEXT SETTLEMENT</div>
        <div className="num font-display text-[27px]">
          {oracle ? expiryCountdown(oracle.expiryMs) : '—'}
        </div>
      </div>
      <div className="hidden h-10 w-px bg-line sm:block" />
      <div>
        <div className="text-[9px] font-black tracking-[0.12em] text-muted">LIVE ODDS · VOL SURFACE</div>
        <div className="flex gap-2 pt-1">
          <span className="num rounded-full px-2.5 py-0.5 text-[14px] font-black" style={{ background: 'var(--up-glow)', color: 'var(--up)' }}>
            ▲ ×{quote ? quote.up.multiplier.toFixed(2) : '—'}
          </span>
          <span className="num rounded-full px-2.5 py-0.5 text-[14px] font-black" style={{ background: 'var(--down-glow)', color: 'var(--down)' }}>
            ▼ ×{quote ? quote.down.multiplier.toFixed(2) : '—'}
          </span>
        </div>
      </div>
      <div className="flex-1" />
      <a href="/" className="text-[15px] font-black text-gold">
        Join the round →
      </a>
    </div>
  );
}
