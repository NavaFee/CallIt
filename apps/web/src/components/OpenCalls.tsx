'use client';

import { useRef, useState } from 'react';
import type { PositionWire } from '@/lib/api';
import { expiryCountdown, fixedToUsdNum, fmtDusdcUnits, fmtUsd } from '@/lib/format';

export type EnrichedPosition = PositionWire & { cashoutUnits?: string | null };

const HOLD_MS = 650;

/**
 * Open call card: direction, strike, countdown, live exit value, and the
 * hold-to-confirm cash-out interaction (650ms press, fill bar progress).
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
  const strikeUsd = fixedToUsdNum(position.market.strike);
  const winning = spotUsd != null && (up ? spotUsd > strikeUsd : spotUsd <= strikeUsd);
  const expiryMs = Number(position.market.expiry);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[20px]" style={{ color: up ? 'var(--up)' : 'var(--down)' }}>
            {up ? '▲' : '▼'}
          </span>
          <div>
            <div className="text-[14px] font-black">
              {up ? 'ABOVE' : 'AT/BELOW'} <span className="num">${fmtUsd(strikeUsd, 0)}</span>
            </div>
            <div className="num text-[11px] font-bold text-muted">
              settles in {expiryCountdown(expiryMs)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="rounded-full px-2 py-0.5 text-[10px] font-black"
            style={{
              background: winning ? 'var(--up-glow)' : 'var(--down-glow)',
              color: winning ? 'var(--up)' : 'var(--down)',
              animation: 'ci-pulse 1.3s ease-in-out infinite',
            }}
          >
            {winning ? 'WINNING' : 'BEHIND'}
          </div>
          <div className="mt-1 text-[10px] font-bold text-muted">
            TO WIN{' '}
            <span className="num font-display text-[15px] text-gold">
              {fmtDusdcUnits(position.quantityUnits)}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="relative mt-3 h-[52px] w-full overflow-hidden rounded-2xl border border-line text-[13px] font-black"
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
