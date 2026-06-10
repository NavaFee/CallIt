'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type PublicSession } from '@/lib/api';
import type { MarketSnapshot, QuoteResponse } from '@/lib/server/market';
import { fixedToUsdNum, fmtDusdcUnits, fmtUsd, shortAddr } from '@/lib/format';
import { ChunkyButton } from './ChunkyButton';
import { LeftRail, RightRail } from './DesktopRails';
import { ExpiryChips } from './ExpiryChips';
import { LivePrice } from './LivePrice';
import { Onboarding } from './Onboarding';
import { OpenCallCard, type EnrichedPosition } from './OpenCalls';
import { ResultOverlay, type ResultData } from './ResultOverlay';
import { Sparkline } from './Sparkline';
import { StreakFlame } from './StreakFlame';
import { useToast } from './Toast';

const STAKES = [1, 5, 10, 25];
const BADGE_NAMES: Record<string, string> = {
  first: 'First Call',
  hat: 'Hat Trick',
  fire: 'On Fire',
  exit: 'Smooth Exit',
  whale: 'High Roller',
  sharp: 'Sharp Caller',
};
const MARKET_POLL_MS = 4_000;
const QUOTE_POLL_MS = 5_000;
const POSITIONS_POLL_MS = 12_000;

export function PlayScreen() {
  const toast = useToast();

  const [session, setSession] = useState<PublicSession | null | undefined>(undefined);
  const [balanceUnits, setBalanceUnits] = useState('0');
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [points, setPoints] = useState<number[]>([]);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteSeq, setQuoteSeq] = useState(0);
  const [picked, setPicked] = useState<'up' | 'down' | null>(null);
  const [stake, setStake] = useState(5);
  const [placing, setPlacing] = useState<number | null>(null);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [streak, setStreak] = useState(0);
  const [chartW, setChartW] = useState(343);
  const chartRef = useRef<HTMLDivElement>(null);
  const settling = useRef(false);

  const announceBadges = useCallback(
    (types: string[] | undefined) => {
      for (const t of types ?? []) {
        toast.push('money', `BADGE UNLOCKED — ${BADGE_NAMES[t] ?? t}`);
      }
    },
    [toast],
  );

  const selected = useMemo(
    () => market?.oracles.find((o) => o.oracleId === selectedId) ?? null,
    [market, selectedId],
  );
  const spotUsd = selected?.spotUsd ?? null;
  const fuse = selected && !selected.tradeable ? selected.fuse ?? { reason: 'unknown', detail: '' } : null;
  const openPositions = positions.filter((p) => p.status === 'open');

  // ── session bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    api
      .session()
      .then((res) => {
        setSession(res.session);
        if (res.balanceUnits) setBalanceUnits(res.balanceUnits);
        if (res.session) {
          api.profile().then((p) => setStreak(p.stats?.streak.current ?? 0)).catch(() => {});
        }
      })
      .catch(() => setSession(null));
  }, []);

  // ── market poll (oracle list + health + spot) ──────────────────────
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .market()
        .then((snap) => {
          if (!alive) return;
          setMarket(snap);
          setSelectedId((cur) => {
            if (cur && snap.oracles.some((o) => o.oracleId === cur)) return cur;
            return snap.oracles.find((o) => o.tradeable)?.oracleId ?? snap.oracles[0]?.oracleId ?? null;
          });
        })
        .catch(() => {});
    load();
    const t = setInterval(load, MARKET_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ── sparkline: seed history, then append live spots ────────────────
  useEffect(() => {
    if (!selectedId) return;
    setPoints([]);
    api
      .prices(selectedId)
      .then((res) => setPoints(res.points.map((p) => p.usd)))
      .catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    if (spotUsd == null) return;
    setPoints((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === spotUsd) return prev;
      return [...prev.slice(-119), spotUsd];
    });
  }, [spotUsd]);

  useEffect(() => {
    const measure = () => chartRef.current && setChartW(chartRef.current.clientWidth - 28);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── live two-sided quote ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || fuse) {
      setQuote(null);
      return;
    }
    let alive = true;
    const stakeUnits = BigInt(Math.round(stake * 1e6)).toString();
    const load = () =>
      api
        .quote(selectedId, stakeUnits)
        .then((q) => {
          if (!alive) return;
          setQuote((prev) => {
            if (prev && (prev.up.askFixed !== q.up.askFixed || prev.down.askFixed !== q.down.askFixed)) {
              setQuoteSeq((s) => s + 1);
            }
            return q;
          });
        })
        .catch(() => {});
    load();
    const t = setInterval(load, QUOTE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [selectedId, stake, fuse]);

  // ── positions + settlement detection ───────────────────────────────
  const refreshPositions = useCallback(() => {
    if (!session) return;
    api
      .positions()
      .then((res) => {
        setPositions(res.positions as EnrichedPosition[]);
        setBalanceUnits(res.balanceUnits);
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    refreshPositions();
    const t = setInterval(refreshPositions, POSITIONS_POLL_MS);
    return () => clearInterval(t);
  }, [refreshPositions]);

  useEffect(() => {
    const expired = openPositions.some((p) => Number(p.market.expiry) <= Date.now());
    if (!expired || settling.current) return;
    settling.current = true;
    api
      .settle()
      .then((res) => {
        setBalanceUnits(res.balanceUnits);
        const [first, ...rest] = res.events;
        if (first) {
          setResult({
            kind: first.won ? 'won' : 'lost',
            payoutUnits: first.payoutUnits,
            costUnits: first.position.costUnits,
            strikeUsd: fixedToUsdNum(first.position.market.strike),
            settleUsd: fixedToUsdNum(first.settlementPrice),
            isUp: first.position.market.isUp,
            balanceUnits: res.balanceUnits,
          });
        }
        for (const e of rest) {
          toast.push('money', `${e.won ? 'WON' : 'LOST'} ${e.won ? '+' : ''}${fmtDusdcUnits(e.payoutUnits)} dUSDC`);
        }
        for (const s of res.social ?? []) {
          announceBadges(s.newBadges);
          if (s.streak) setStreak(s.streak.current);
        }
        refreshPositions();
      })
      .catch(() => {})
      .finally(() => {
        settling.current = false;
      });
  }, [openPositions, refreshPositions, toast, announceBadges]);

  // ── actions ────────────────────────────────────────────────────────
  const claim = useCallback(async () => {
    try {
      const res = await api.register();
      setSession(res.session);
      setBalanceUnits(res.balanceUnits);
      toast.push('money', `+${fmtDusdcUnits(res.airdroppedUnits)} dUSDC welcome stack`);
      if (res.session.managerId) {
        toast.push('tx', `On-chain account ${shortAddr(res.session.managerId)} created`);
      }
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'registration failed');
      throw err;
    }
  }, [toast]);

  const placeBet = useCallback(async () => {
    if (!picked || !selectedId || !quote) return;
    setPlacing(0);
    const stepper = setInterval(() => setPlacing((s) => (s == null || s >= 2 ? s : s + 1)), 600);
    try {
      const res = await api.bet({
        oracleId: selectedId,
        side: picked,
        stakeUnits: BigInt(Math.round(stake * 1e6)).toString(),
        strike: quote.strike,
      });
      setBalanceUnits(res.balanceUnits);
      toast.push('tx', `Call locked${res.txDigest ? ` on-chain · ${res.txDigest.slice(0, 8)}…` : ''}`);
      announceBadges(res.newBadges);
      setPicked(null);
      refreshPositions();
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'bet failed');
    } finally {
      clearInterval(stepper);
      setPlacing(null);
    }
  }, [picked, selectedId, quote, stake, toast, refreshPositions, announceBadges]);

  const cashOut = useCallback(
    async (positionId: string) => {
      const pos = positions.find((p) => p.id === positionId);
      try {
        const res = await api.cashout(positionId);
        setBalanceUnits(res.balanceUnits);
        announceBadges(res.social?.newBadges);
        if (res.social?.streak) setStreak(res.social.streak.current);
        refreshPositions();
        setResult({
          kind: 'cashed_out',
          payoutUnits: res.payoutUnits,
          costUnits: pos?.costUnits ?? '0',
          strikeUsd: pos ? fixedToUsdNum(pos.market.strike) : 0,
          settleUsd: spotUsd ?? undefined,
          isUp: pos?.market.isUp ?? true,
          balanceUnits: res.balanceUnits,
          txDigest: res.txDigest,
        });
      } catch (err) {
        toast.push('error', err instanceof Error ? err.message : 'cashout failed');
      }
    },
    [positions, refreshPositions, spotUsd, toast, announceBadges],
  );

  // ── render ─────────────────────────────────────────────────────────
  const priceUp = points.length >= 2 ? points[points.length - 1]! >= points[Math.max(0, points.length - 30)]! : true;
  const delta = points.length >= 2 ? points[points.length - 1]! - points[Math.max(0, points.length - 30)]! : 0;

  return (
    <div className="relative mx-auto lg:grid lg:max-w-[1280px] lg:grid-cols-[290px_minmax(0,1fr)_310px] lg:items-start lg:gap-5 lg:px-6 lg:pt-5">
      <LeftRail positions={positions} spotUsd={spotUsd} onCashOut={cashOut} />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-28 pt-4 lg:min-h-0 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-0">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full font-display text-[13px]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
              border: '2px solid #E9A718',
              color: '#5B3D00',
            }}
          >
            $
          </div>
          <span className="font-display text-[24px]">
            Call<span className="text-gold">It</span>
          </span>
          {streak > 0 && <StreakFlame streak={streak} size={15} />}
        </div>
        {session && (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-black">
              <span className="num text-gold" data-testid="balance">
                {fmtDusdcUnits(balanceUnits)}
              </span>{' '}
              <span className="text-[10px] text-muted">dUSDC</span>
            </span>
            <span className="rounded-full border border-line bg-card px-2.5 py-1.5 text-[10px] font-bold text-muted">
              {shortAddr(session.address)}
            </span>
          </div>
        )}
      </header>

      {/* chart card */}
      <section ref={chartRef} className="rounded-3xl border border-line bg-card p-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-muted">
              BTC · USD
              <span
                className="ml-1 h-1.5 w-1.5 rounded-full bg-up"
                style={{ animation: 'ci-glow-pulse 1.4s ease-in-out infinite' }}
              />
              <span className="text-up">LIVE</span>
              {selected?.priceAgeMs != null && (
                <span className="num text-muted opacity-70">{Math.round(selected.priceAgeMs / 1000)}s</span>
              )}
            </div>
            <LivePrice usd={spotUsd} />
          </div>
          <div
            className="num rounded-full px-2.5 py-1 text-[12px] font-black"
            style={{
              background: priceUp ? 'var(--up-glow)' : 'var(--down-glow)',
              color: priceUp ? 'var(--up)' : 'var(--down)',
            }}
          >
            {priceUp ? '▲' : '▼'} {fmtUsd(Math.abs(delta))}
          </div>
        </div>
        <div className="mt-2">
          <Sparkline points={points} width={chartW} height={120} up={priceUp} />
        </div>
      </section>

      {/* fuse banner */}
      {fuse && (
        <div
          className="rounded-2xl border px-4 py-3 text-center"
          style={{ borderColor: 'rgba(255,61,94,0.5)', background: 'rgba(255,61,94,0.08)' }}
          data-testid="fuse-banner"
        >
          <div className="font-display text-[16px] text-down" style={{ animation: 'ci-blink 1.2s infinite' }}>
            ORACLE {fuse.reason === 'price_stale' || fuse.reason === 'svi_stale' ? 'STALE' : 'PAUSED'}
          </div>
          <div className="text-[11px] font-bold text-muted">
            Betting is disabled until the feed recovers · {fuse.detail}
          </div>
        </div>
      )}

      {/* controls */}
      <section className="rounded-3xl border border-line bg-card p-3.5">
        {market ? (
          <ExpiryChips oracles={market.oracles} selected={selectedId} onSelect={setSelectedId} />
        ) : (
          <div className="py-2 text-center text-[12px] font-bold text-muted">loading markets…</div>
        )}

        {placing != null ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-5">
            <div
              className="h-[26px] w-[26px] rounded-full border-4 border-white/10"
              style={{
                borderTopColor: placing >= 1 ? 'var(--sui)' : picked === 'down' ? 'var(--down)' : 'var(--up)',
                animation: 'ci-ring-spin 0.7s linear infinite',
              }}
            />
            <div className="text-[13px] font-extrabold text-muted" key={placing} style={{ animation: 'ci-rise 0.3s ease-out' }}>
              {placing === 0 ? 'Signing transaction…' : placing === 1 ? 'Submitting to Sui…' : 'Locked ✓'}
            </div>
          </div>
        ) : picked == null ? (
          <>
            <div className="mt-3 flex gap-3">
              {(['up', 'down'] as const).map((side) => {
                const q = quote?.[side];
                return (
                  <ChunkyButton
                    key={side}
                    hue={side}
                    edgeH={8}
                    disabled={!!fuse || !q || !session}
                    onClick={() => setPicked(side)}
                    className="h-[104px] flex-1 flex-col gap-0.5 rounded-[22px]"
                    data-testid={`call-${side}`}
                  >
                    <span className="font-display text-[32px] leading-none">{side === 'up' ? '▲' : '▼'}</span>
                    <span className="text-[20px] tracking-wide">{side.toUpperCase()}</span>
                    <span className="relative overflow-hidden rounded px-1 text-[13px] font-black opacity-80">
                      {q ? `×${q[side === 'up' ? 'multiplier' : 'multiplier'].toFixed(2)}` : '—'}
                      <span
                        key={quoteSeq}
                        className="absolute inset-y-0 left-0 w-[45%]"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
                          animation: quoteSeq > 0 ? 'ci-shimmer 0.9s ease-out' : undefined,
                        }}
                      />
                    </span>
                  </ChunkyButton>
                );
              })}
            </div>
            <div className="mt-2.5 text-center text-[10.5px] font-bold text-muted">
              odds refresh off the live vol surface · strike {quote ? `$${fmtUsd(quote.strikeUsd, 0)}` : '—'}
            </div>
          </>
        ) : (
          <div className="mt-3" style={{ animation: 'ci-rise 0.25s ease-out' }}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[19px]" style={{ color: picked === 'up' ? 'var(--up)' : 'var(--down)' }}>
                {picked === 'up' ? '▲ CALLING UP' : '▼ CALLING DOWN'}
              </span>
              <button type="button" className="text-[12px] font-black text-muted" onClick={() => setPicked(null)}>
                ✕ cancel
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {STAKES.map((s) => {
                const active = s === stake;
                const tooMuch = BigInt(Math.round(s * 1e6)) > BigInt(balanceUnits);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={tooMuch}
                    onClick={() => setStake(s)}
                    className="ci-pressable flex-1 rounded-xl py-2.5 text-[15px] font-black"
                    style={{
                      background: active
                        ? `linear-gradient(180deg, ${picked === 'up' ? 'var(--up-hi)' : 'var(--down-hi)'}, ${picked === 'up' ? 'var(--up)' : 'var(--down)'})`
                        : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${active ? 'transparent' : 'var(--line)'}`,
                      color: active ? (picked === 'up' ? '#06291A' : '#2B0410') : 'var(--text)',
                      opacity: tooMuch ? 0.35 : 1,
                    }}
                    data-testid={`stake-${s}`}
                  >
                    ${s}
                  </button>
                );
              })}
            </div>
            <ChunkyButton
              hue={picked}
              edgeH={6}
              disabled={!quote || BigInt(Math.round(stake * 1e6)) > BigInt(balanceUnits)}
              onClick={placeBet}
              className="mt-3 h-[62px] w-full flex-col gap-0 text-[19px]"
              data-testid="lock-button"
            >
              LOCK IT IN
              {quote && (
                <span className="num text-[12px] font-black opacity-75">
                  win {fmtDusdcUnits(quote[picked].quantityUnits)} dUSDC
                </span>
              )}
            </ChunkyButton>
          </div>
        )}
      </section>

      {/* open calls (mobile; desktop shows them in the left rail) */}
      {openPositions.length > 0 && (
        <section className="flex flex-col gap-2.5 lg:hidden">
          <h2 className="px-1 text-[10px] font-black tracking-[0.14em] text-muted">OPEN CALLS</h2>
          {openPositions.map((p) => (
            <OpenCallCard key={p.id} position={p} spotUsd={spotUsd} onCashOut={cashOut} />
          ))}
        </section>
      )}

      {market?.oracleListStale && (
        <div className="text-center text-[10px] font-bold text-muted opacity-70">
          market list served from cache — indexer catching up
        </div>
      )}

      {/* overlays */}
      {result && <ResultOverlay result={result} onClose={() => setResult(null)} />}
      {session === null && <Onboarding onClaim={claim} />}
      </div>
      <RightRail streak={streak} />
    </div>
  );
}
