'use client';

import { useEffect, useState } from 'react';
import { ChunkyButton } from './ChunkyButton';
import { Confetti } from './Confetti';
import { fmtDusdcUnits, fmtUsd } from '@/lib/format';

export interface ResultData {
  kind: 'won' | 'lost' | 'cashed_out';
  /** payout in 1e6 units (string) */
  payoutUnits: string;
  costUnits: string;
  strikeUsd: number;
  settleUsd?: number;
  isUp: boolean;
  balanceUnits: string;
  txDigest?: string;
}

/** Payout count-up (gold), ~1s ease-out. */
function CountUp({ units }: { units: string }) {
  const target = Number(BigInt(units)) / 1e6;
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1000, 1);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className="num">{fmtUsd(value)}</span>;
}

export function ResultOverlay({ result, onClose }: { result: ResultData; onClose: () => void }) {
  const { kind } = result;
  const title = kind === 'won' ? 'CALLED IT!' : kind === 'cashed_out' ? 'CASHED OUT' : 'MISSED CALL';
  const confetti = kind === 'won' ? 160 : kind === 'cashed_out' && BigInt(result.payoutUnits) > BigInt(result.costUnits) ? 70 : 0;
  const pnl = BigInt(result.payoutUnits) - BigInt(result.costUnits);

  return (
    <div
      className="absolute inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background:
          kind === 'won'
            ? 'radial-gradient(circle at 50% 36%, rgba(0,224,123,0.16), rgba(7,9,15,0.96) 65%)'
            : kind === 'cashed_out'
              ? 'radial-gradient(circle at 50% 36%, rgba(255,197,61,0.13), rgba(7,9,15,0.96) 65%)'
              : 'rgba(7,9,15,0.95)',
        backdropFilter: 'blur(8px)',
      }}
      data-testid="result-overlay"
    >
      {kind === 'won' && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--up)', animation: 'ci-flash 0.5s ease-out forwards' }}
        />
      )}
      <Confetti count={confetti} />

      <div style={{ animation: kind === 'lost' ? 'ci-shake 0.55s ease-out' : undefined }}>
        <h1
          className="font-display"
          style={{
            fontSize: kind === 'won' ? 52 : 42,
            animation: 'ci-pop-big 0.55s cubic-bezier(0.2,1.5,0.4,1)',
            textShadow: kind === 'won' ? '0 0 38px rgba(0,224,123,0.5)' : undefined,
            color: kind === 'lost' ? 'var(--muted)' : 'var(--text)',
          }}
        >
          {title}
        </h1>

        <div className="mt-3" style={{ animation: 'ci-rise 0.4s ease-out 0.25s backwards' }}>
          {BigInt(result.payoutUnits) > 0n ? (
            <div className="font-display text-[40px] text-gold">
              +<CountUp units={result.payoutUnits} /> <span className="text-[20px]">dUSDC</span>
            </div>
          ) : (
            <div className="font-display text-[36px] text-down">
              −{fmtDusdcUnits(result.costUnits)} <span className="text-[18px]">dUSDC</span>
            </div>
          )}
          {kind === 'cashed_out' && (
            <div className="mt-1 text-[13px] font-bold text-muted">
              redeemed early off the live surface
              {pnl > 0n ? ` · +${fmtDusdcUnits(pnl.toString())} profit` : ''}
            </div>
          )}
        </div>

        <div
          className="mx-auto mt-5 flex items-center gap-4 rounded-2xl border border-line bg-card px-5 py-3"
          style={{ animation: 'ci-rise 0.4s ease-out 0.4s backwards' }}
        >
          <div>
            <div className="text-[9px] font-black tracking-[0.12em] text-muted">STRIKE</div>
            <div className="num font-display text-[17px]">${fmtUsd(result.strikeUsd, 0)}</div>
          </div>
          <div className="text-muted">{result.isUp ? '▲' : '▼'}</div>
          <div>
            <div className="text-[9px] font-black tracking-[0.12em] text-muted">
              {kind === 'cashed_out' ? 'EXITED' : 'SETTLED'}
            </div>
            <div className="num font-display text-[17px]">
              {result.settleUsd != null ? `$${fmtUsd(result.settleUsd, 0)}` : '—'}
            </div>
          </div>
        </div>

        <div
          className="mt-4 text-[12px] font-bold text-muted"
          style={{ animation: 'ci-rise 0.4s ease-out 0.55s backwards' }}
        >
          {kind === 'won'
            ? 'Payout auto-claimed · Sui testnet'
            : kind === 'cashed_out'
              ? 'Settled instantly at the live bid'
              : 'the market had other plans'}
          {result.txDigest ? ` · tx ${result.txDigest.slice(0, 6)}…` : ''}
        </div>
        <div
          className="mt-1 text-[13px] font-extrabold"
          style={{ animation: 'ci-rise 0.4s ease-out 0.65s backwards' }}
        >
          Balance: <span className="num text-gold">{fmtDusdcUnits(result.balanceUnits)} dUSDC</span>
        </div>

        <div style={{ animation: 'ci-rise 0.4s ease-out 0.75s backwards' }}>
          <ChunkyButton
            hue={kind === 'won' ? 'gold' : kind === 'cashed_out' ? 'sui' : 'dim'}
            className="mx-auto mt-6 h-[56px] px-8 text-[17px]"
            onClick={onClose}
            data-testid="result-close"
          >
            {kind === 'won' ? 'KEEP ROLLING' : kind === 'cashed_out' ? 'BACK TO THE CHART' : 'RUN IT BACK'}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
