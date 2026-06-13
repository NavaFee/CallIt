'use client';

import { useEffect, useRef, useState } from 'react';
import type { PositionWire } from '@/lib/api';
import { expiryCountdown, fixedToUsdNum, fmtDusdcUnits, fmtUsd } from '@/lib/format';

export type EnrichedPosition = PositionWire & { cashoutUnits?: string | null };

const HOLD_MS = 650;

/** mm:ss inside the final hour, the coarse countdown beyond it. */
function clockLabel(remainingMs: number): string {
  if (remainingMs <= 0) return '0:00';
  if (remainingMs >= 3600_000) return expiryCountdown(Date.now() + remainingMs);
  const total = Math.floor(remainingMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Open call card, ported from the design prototype's live-round panel:
 * big ORACLE EXPIRY IN countdown, WINNING/BEHIND badge with the ±$ delta
 * vs lock, round progress bar, the position bar with TO WIN, and the
 * hold-to-confirm cash-out (650ms press, fill bar progress).
 */
export function OpenCallCard({
  position,
  spotUsd,
  onCashOut,
}: {
  position: EnrichedPosition;
  spotUsd: number | null;
  onCashOut: (id: string) => void;
}) {
  const [hold, setHold] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fired = useRef(false);
  // second-level countdown needs its own tick (polls are 4s+)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startHold = () => {
    fired.current = false;
    const start = performance.now();
    timer.current = setInterval(() => {
      const t = Math.min((performance.now() - start) / HOLD_MS, 1);
      setHold(t);
      if (t >= 1 && !fired.current) {
        fired.current = true;
        stopHold();
        onCashOut(position.id);
      }
    }, 30);
  };
  const stopHold = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHold(0);
  };

  const up = position.market.isUp;
  const color = up ? 'var(--up)' : 'var(--down)';
  const strikeUsd = fixedToUsdNum(position.market.strike);
  const winning = spotUsd != null && (up ? spotUsd > strikeUsd : spotUsd <= strikeUsd);
  const delta = spotUsd != null ? spotUsd - strikeUsd : null;
  const expiryMs = Number(position.market.expiry);
  const remaining = Math.max(0, expiryMs - now);
  const durationMs = Math.max(expiryMs - position.placedAt, 1);
  const progress = Math.min(Math.max(1 - remaining / durationMs, 0), 1);
  const urgent = remaining > 0 && remaining < durationMs * 0.18 && remaining < 3600_000;
  const multiplier = Number(position.quantityUnits) / Math.max(Number(position.costUnits), 1);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: up ? 'rgba(0,224,123,0.35)' : 'rgba(255,61,94,0.35)',
        background: 'var(--card)',
        boxShadow: `0 0 24px ${up ? 'rgba(0,224,123,0.08)' : 'rgba(255,61,94,0.08)'}`,
      }}
      data-testid="open-call"
    >
      {/* countdown + standing badge */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[9px] font-black tracking-[0.14em] text-muted">ORACLE EXPIRY IN</div>
          <div
            className="num font-display text-[34px] leading-[1.05] lg:text-[40px]"
            style={{
              color: urgent ? 'var(--down)' : 'var(--text)',
              animation: urgent ? 'ci-blink 0.9s ease-in-out infinite' : undefined,
            }}
            data-testid="open-call-clock"
          >
            {clockLabel(remaining)}
          </div>
        </div>
        <div
          className="rounded-xl px-3 py-1.5 text-center"
          style={{
            background: winning ? 'var(--up-glow)' : 'var(--down-glow)',
            animation: 'ci-pulse 1.3s ease-in-out infinite',
          }}
        >
          <div className="font-display text-[15px]" style={{ color: winning ? 'var(--up)' : 'var(--down)' }}>
            {winning ? 'WINNING' : 'BEHIND'}
          </div>
          {delta != null && (
            <div
              className="num text-[10px] font-black opacity-85"
              style={{ color: winning ? 'var(--up)' : 'var(--down)' }}
            >
              {delta >= 0 ? '+' : '−'}${fmtUsd(Math.abs(delta))} vs lock
            </div>
          )}
        </div>
      </div>

      {/* round progress */}
      <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: urgent
              ? 'linear-gradient(90deg, var(--gold), var(--down))'
              : `linear-gradient(90deg, var(--sui), ${color})`,
            transition: 'width 0.9s linear',
          }}
        />
      </div>

      {/* your call */}
      <div
        className="mt-2.5 flex items-center gap-2.5 rounded-xl border px-3 py-2"
        style={{ borderColor: up ? 'rgba(0,224,123,0.35)' : 'rgba(255,61,94,0.35)', background: 'rgba(255,255,255,0.04)' }}
      >
        <span className="text-[18px]" style={{ color }}>
          {up ? '▲' : '▼'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="whitespace-nowrap text-[12.5px] font-black">
            {fmtDusdcUnits(position.costUnits)} dUSDC on {up ? 'UP' : 'DOWN'}{' '}
            <span className="num text-muted">×{multiplier.toFixed(2)}</span>
          </div>
          <div className="num text-[10.5px] font-bold text-muted">
            locked @ ${fmtUsd(strikeUsd, 0)} · {up ? 'ABOVE' : 'AT/BELOW'} pays
          </div>
        </div>
        <div className="whitespace-nowrap text-right">
          <div className="text-[9px] font-black tracking-[0.1em] text-muted">TO WIN</div>
          <div className="num font-display text-[16px] text-gold">
            {fmtDusdcUnits(position.quantityUnits)}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="relative mt-2.5 h-[52px] w-full overflow-hidden rounded-2xl border border-line text-[13px] font-black"
        style={{ background: 'linear-gradient(180deg, #232B42, #1A2133)' }}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        data-testid="cashout-button"
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${hold * 100}%`,
            background: 'linear-gradient(90deg, rgba(255,197,61,0.25), rgba(255,197,61,0.55))',
          }}
        />
        <span className="relative">
          {hold > 0 ? 'HOLD…' : 'HOLD TO CASH OUT'}
          {position.cashoutUnits ? (
            <span className="num text-gold"> · {fmtDusdcUnits(position.cashoutUnits)} dUSDC</span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
