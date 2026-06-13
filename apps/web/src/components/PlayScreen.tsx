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
import { WalletSheet } from './WalletSheet';
import { tgWebApp } from '@/lib/tg';
import { telegramAuth, type TgWidgetConfig } from '@/lib/tgAuth';
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
  // real-mode settle events repeat until the keeper claims — announce once
  const announced = useRef(new Set<string>());
  const [offline, setOffline] = useState(0);
  const [refueling, setRefueling] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [tgLinked, setTgLinked] = useState(false);
  const [tgWidget, setTgWidget] = useState<TgWidgetConfig | null>(null);
  const [nudge, setNudge] = useState(false);
  // bumped on every mutation; stale poll responses are dropped
  const balanceVersion = useRef(0);

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
  // positions can live on a different oracle than the selected chart
  const spotFor = useCallback(
    (oracleId: string) => market?.oracles.find((o) => o.oracleId === oracleId)?.spotUsd ?? null,
    [market],
  );
  // lock lines on the chart: one per open call on THIS oracle (Sparkline
  // de-dupes same-price locks and colours each LOCK pill by side)
  const chartLocks = openPositions
    .filter((p) => p.market.oracleId === selectedId)
    .map((p) => ({ usd: fixedToUsdNum(p.market.strike), isUp: p.market.isUp }));

  // ── session bootstrap (Mini App logs in via initData first) ────────
  useEffect(() => {
    const boot = async () => {
      const tg = tgWebApp();
      if (tg) {
        setIsTg(true);
        try {
          tg.ready();
          tg.expand();
          tg.setHeaderColor?.('#07090F');
          tg.setBackgroundColor?.('#07090F');
        } catch {
          // chrome calls are best-effort across TG client versions
        }
        await fetch('/api/tg-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }).catch(() => {});
      }
      api
        .session()
        .then((res) => {
          setSession(res.session);
          if (res.balanceUnits) setBalanceUnits(res.balanceUnits);
          setTgWidget(res.tgWidget ?? null);
          setTgLinked(res.tgLinked ?? false);
          if (res.session) {
            api.profile().then((p) => setStreak(p.stats?.streak.current ?? 0)).catch(() => {});
          }
        })
        .catch(() => setSession(null));
    };
    void boot();
  }, []);

  // ── market poll (oracle list + health + spot) ──────────────────────
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .market()
        .then((snap) => {
          if (!alive) return;
          setOffline(0);
          setMarket(snap);
          setSelectedId((cur) => {
            if (cur && snap.oracles.some((o) => o.oracleId === cur)) return cur;
            return snap.oracles.find((o) => o.tradeable)?.oracleId ?? snap.oracles[0]?.oracleId ?? null;
          });
        })
        .catch(() => {
          if (alive) setOffline((n) => n + 1);
        });
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
    const version = balanceVersion.current;
    api
      .positions()
      .then((res) => {
        setPositions(res.positions as EnrichedPosition[]);
        // a bet/cashout/settle landed while this poll was in flight — its
        // balance is authoritative, the poll's snapshot is stale
        if (balanceVersion.current === version) setBalanceUnits(res.balanceUnits);
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
        balanceVersion.current += 1;
        setBalanceUnits(res.balanceUnits);
        const fresh = res.events.filter((e) => !announced.current.has(e.position.id));
        for (const e of fresh) announced.current.add(e.position.id);
        const [first, ...rest] = fresh;
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
      if (res.airdropFailed) {
        setRefueling(true);
      } else {
        toast.push('money', `+${fmtDusdcUnits(res.airdroppedUnits)} dUSDC welcome stack`);
      }
      if (res.session.managerId) {
        toast.push('tx', `On-chain account ${shortAddr(res.session.managerId)} created`);
      }
      window.dispatchEvent(new CustomEvent('callit:session-changed'));
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'registration failed');
      throw err;
    }
  }, [toast]);

  // ── Telegram Login Widget: onboarding login + guest account linking ──
  const telegramLogin = useCallback(async () => {
    if (!tgWidget) return;
    try {
      const res = await telegramAuth(tgWidget, 'login');
      if (!res) return; // user closed the popup
      const fresh = await api.session();
      setSession(fresh.session);
      if (fresh.balanceUnits) setBalanceUnits(fresh.balanceUnits);
      setTgLinked(true);
      api.profile().then((p) => setStreak(p.stats?.streak.current ?? 0)).catch(() => {});
      if (res.merged) {
        toast.push('money', 'Welcome back — your account is restored');
      } else if (!res.airdropFailed && res.airdroppedUnits !== '0') {
        toast.push('money', `+${fmtDusdcUnits(res.airdroppedUnits)} dUSDC welcome stack`);
      }
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Telegram login failed');
      throw err;
    }
  }, [tgWidget, toast]);

  // one-shot post-settlement nudge for guests (shows once, ever)
  const closeResult = useCallback(() => {
    setResult(null);
    if (isTg || tgLinked || !tgWidget) return;
    try {
      if (localStorage.getItem('callit_link_nudge_done')) return;
      localStorage.setItem('callit_link_nudge_done', '1');
    } catch {
      return;
    }
    setNudge(true);
  }, [isTg, tgLinked, tgWidget]);

  const claimTopup = useCallback(async () => {
    try {
      const res = await fetch('/api/topup', { method: 'POST' });
      const data = (await res.json()) as { amount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'refill failed');
      toast.push('money', `+${data.amount?.toFixed(2)} dUSDC daily refill`);
      refreshPositions();
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'refill failed');
    }
  }, [toast, refreshPositions]);

  /** Link the current guest account; returns true when bound. */
  const linkTelegram = useCallback(async (): Promise<boolean> => {
    if (!tgWidget) return false;
    try {
      const res = await telegramAuth(tgWidget, 'link');
      if (!res) return false;
      setTgLinked(true);
      setNudge(false);
      toast.push('money', 'Telegram linked — your account is now recoverable');
      return true;
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Telegram link failed');
      return false;
    }
  }, [tgWidget, toast]);

  const placeBet = useCallback(async () => {
    if (!picked || !selectedId || !quote) return;
    tgWebApp()?.HapticFeedback?.impactOccurred?.('medium');
    setPlacing(0);
    const stepper = setInterval(() => setPlacing((s) => (s == null || s >= 2 ? s : s + 1)), 600);
    try {
      const res = await api.bet({
        oracleId: selectedId,
        side: picked,
        stakeUnits: BigInt(Math.round(stake * 1e6)).toString(),
        strike: quote.strike,
      });
      balanceVersion.current += 1;
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
        balanceVersion.current += 1;
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

  // ── Telegram Mini App chrome (the bet button is the in-page one — same
  // as web — so the flow reads identically in both; haptics stay native) ─
  // closing confirmation while a call is open
  useEffect(() => {
    const tg = tgWebApp();
    if (!isTg || !tg) return;
    if (openPositions.length > 0) tg.enableClosingConfirmation?.();
    else tg.disableClosingConfirmation?.();
  }, [isTg, openPositions.length]);

  // win haptic
  useEffect(() => {
    if (!isTg || result?.kind !== 'won') return;
    tgWebApp()?.HapticFeedback?.notificationOccurred('success');
  }, [isTg, result]);

  // ── render ─────────────────────────────────────────────────────────
  const priceUp = points.length >= 2 ? points[points.length - 1]! >= points[Math.max(0, points.length - 30)]! : true;
  const delta = points.length >= 2 ? points[points.length - 1]! - points[Math.max(0, points.length - 30)]! : 0;

  return (
    <>
      {/* desktop top bar (design-aligned): logo · BTC ticker · TESTNET ·
          streak · dUSDC chip → wallet modal. Mobile keeps the compact header. */}
      {session && (
        <div
          className="sticky top-0 z-20 hidden border-b border-line lg:block"
          style={{ background: 'rgba(11,14,22,0.85)', backdropFilter: 'blur(10px)' }}
          data-testid="desktop-topbar"
        >
          <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-4 px-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[14px]"
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
            </div>
            <div
              className="num flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-black"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-[10px] tracking-[0.08em] text-muted">BTC</span>
              <span>{spotUsd != null ? `$${fmtUsd(spotUsd)}` : '—'}</span>
              <span
                className="h-1.5 w-1.5 rounded-full bg-up"
                style={{ boxShadow: '0 0 6px var(--up)', animation: 'ci-glow-pulse 1.4s ease-in-out infinite' }}
              />
            </div>
            <div className="flex-1" />
            <span
              className="rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.1em] text-sui"
              style={{ borderColor: 'rgba(77,162,255,0.35)', background: 'rgba(77,162,255,0.1)' }}
            >
              SUI TESTNET
            </span>
            {streak > 0 && <StreakFlame streak={streak} size={24} />}
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="ci-pressable flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{ borderColor: 'rgba(255,197,61,0.4)', background: 'rgba(255,197,61,0.1)' }}
              data-testid="desktop-wallet-chip"
            >
              <span className="num text-[15px] font-black text-gold" data-testid="balance-desktop">
                {fmtDusdcUnits(balanceUnits)}
              </span>
              <span className="text-[11px] font-bold text-muted">dUSDC</span>
            </button>
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="ci-pressable rounded-full border border-line px-2.5 py-1.5 text-[10px] font-bold text-muted"
            >
              {shortAddr(session.address)}
            </button>
          </div>
        </div>
      )}
    <div className="relative mx-auto lg:grid lg:max-w-[1280px] lg:grid-cols-[290px_minmax(0,1fr)_310px] lg:items-start lg:gap-5 lg:px-6 lg:pt-5">
      <LeftRail positions={positions} spotFor={spotFor} onCashOut={cashOut} />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-28 pt-4 lg:min-h-0 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-0">
      {/* header (mobile + Mini App; desktop uses the top bar above) */}
      <header className="flex items-center justify-between lg:hidden">
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
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="ci-pressable rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-black"
              data-testid="wallet-chip"
            >
              <span className="num text-gold" data-testid="balance">
                {fmtDusdcUnits(balanceUnits)}
              </span>{' '}
              <span className="text-[10px] text-muted">dUSDC</span>
            </button>
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="ci-pressable rounded-full border border-line bg-card px-2.5 py-1.5 text-[10px] font-bold text-muted"
            >
              {shortAddr(session.address)}
            </button>
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
            <div className="mt-0.5 text-[8.5px] font-bold tracking-[0.08em] text-muted opacity-70">
              TESTNET ORACLE FEED — NOT SPOT BTC
            </div>
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
          <Sparkline points={points} width={chartW} height={120} up={priceUp} locks={chartLocks} />
        </div>
      </section>

      {/* airdrop pool degraded state */}
      {refueling && (
        <div
          className="rounded-2xl border px-4 py-3 text-center"
          style={{ borderColor: 'rgba(77,162,255,0.5)', background: 'rgba(77,162,255,0.08)' }}
          data-testid="refueling-banner"
        >
          <div className="font-display text-[15px] text-sui">PRACTICE STACK IS REFUELING</div>
          <div className="text-[11px] font-bold text-muted">
            The faucet pool is topping up — ping us on Telegram and we’ll fund you by hand
          </div>
        </div>
      )}

      {/* broke state: deposit or claim the daily refill */}
      {session && !refueling && BigInt(balanceUnits) < 1_000_000n && placing == null && (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'rgba(255,197,61,0.5)', background: 'rgba(255,197,61,0.06)' }}
          data-testid="topup-card"
        >
          <div className="font-display text-[15px] text-gold">OUT OF AMMO</div>
          <div className="mt-0.5 text-[11px] font-bold text-muted">
            Deposit dUSDC to your address, or grab the once-a-day refill.
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              className="ci-pressable flex-1 rounded-xl border border-line bg-white/[0.05] py-2 text-[12px] font-black"
              onClick={() => setWalletOpen(true)}
            >
              DEPOSIT
            </button>
            {isTg || tgLinked || !tgWidget ? (
              <button
                type="button"
                className="ci-pressable flex-1 rounded-xl py-2 text-[12px] font-black text-[#3A2700]"
                style={{ background: 'linear-gradient(180deg, #FFE08A, var(--gold) 42%)', boxShadow: '0 3px 0 var(--gold-deep)' }}
                data-testid="topup-claim"
                onClick={claimTopup}
              >
                CLAIM 5 dUSDC
              </button>
            ) : (
              // the daily refill is the linking incentive — guests bind first
              <button
                type="button"
                className="ci-pressable flex-1 rounded-xl py-2 text-[12px] font-black text-[#04203D]"
                style={{ background: 'linear-gradient(180deg, #8FC6FF, var(--sui) 42%)', boxShadow: '0 3px 0 #1E5E9E' }}
                data-testid="topup-link"
                onClick={async () => {
                  if (await linkTelegram()) await claimTopup();
                }}
              >
                LINK TELEGRAM TO CLAIM
              </button>
            )}
          </div>
        </div>
      )}

      {/* one-time post-settlement nudge: the account is browser-local */}
      {nudge && session && !isTg && !tgLinked && tgWidget && (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'rgba(77,162,255,0.5)', background: 'rgba(77,162,255,0.08)' }}
          data-testid="link-nudge"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-display text-[14px] text-sui">NICE — FIRST SETTLEMENT IN THE BOOKS</div>
              <div className="mt-0.5 text-[11px] font-bold text-muted">
                Your account lives in this browser — link Telegram to keep it across devices.
              </div>
            </div>
            <button
              type="button"
              aria-label="dismiss"
              className="text-[14px] font-black text-muted"
              data-testid="link-nudge-close"
              onClick={() => setNudge(false)}
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            className="ci-pressable mt-2.5 w-full rounded-xl py-2 text-[12px] font-black text-[#04203D]"
            style={{ background: 'linear-gradient(180deg, #8FC6FF, var(--sui) 42%)', boxShadow: '0 3px 0 #1E5E9E' }}
            data-testid="link-nudge-cta"
            onClick={() => void linkTelegram()}
          >
            ✈️ LINK TELEGRAM
          </button>
        </div>
      )}

      {/* connection banner */}
      {offline >= 2 && (
        <div
          className="rounded-2xl border px-4 py-2.5 text-center"
          style={{ borderColor: 'rgba(255,197,61,0.5)', background: 'rgba(255,197,61,0.08)' }}
          data-testid="offline-banner"
        >
          <span className="text-[12px] font-black text-gold" style={{ animation: 'ci-blink 1.2s infinite' }}>
            CONNECTION LOST
          </span>
          <span className="ml-2 text-[11px] font-bold text-muted">retrying — your funds are safe on-chain</span>
        </div>
      )}

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
            {quote && (
              <div className="mt-2 text-center text-[10px] font-bold text-muted">
                protocol round-trip spread ≈{' '}
                <span className="num">
                  {(
                    (Number(BigInt(quote[picked].costUnits) - BigInt(quote[picked].redeemUnits)) /
                      Math.max(Number(quote[picked].costUnits), 1)) * 100
                  ).toFixed(1)}
                  %
                </span>{' '}
                · what you'd lose exiting this second
              </div>
            )}
          </div>
        )}
      </section>

      {/* open calls (mobile; desktop shows them in the left rail) */}
      {openPositions.length > 0 && (
        <section className="flex flex-col gap-2.5 lg:hidden">
          <h2 className="px-1 text-[10px] font-black tracking-[0.14em] text-muted">OPEN CALLS</h2>
          {openPositions.map((p) => (
            <OpenCallCard key={p.id} position={p} spotUsd={spotFor(p.market.oracleId)} onCashOut={cashOut} />
          ))}
        </section>
      )}

      {market?.oracleListStale && (
        <div className="text-center text-[10px] font-bold text-muted opacity-70">
          market list served from cache — indexer catching up
        </div>
      )}

      {/* overlays */}
      <WalletSheet
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onLinkTelegram={tgWidget && !isTg ? linkTelegram : undefined}
      />
      {result && <ResultOverlay result={result} onClose={closeResult} />}
      {session === null && <Onboarding onClaim={claim} onTelegram={tgWidget ? telegramLogin : null} />}
      </div>
      <RightRail streak={streak} />
    </div>
    </>
  );
}
