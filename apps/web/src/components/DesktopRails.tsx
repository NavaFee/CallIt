'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fixedToUsdNum, fmtDusdcUnits, fmtUsd, shortAddr } from '@/lib/format';
import type { EnrichedPosition } from './OpenCalls';
import { OpenCallCard } from './OpenCalls';
import { StreakFlame } from './StreakFlame';

/** Left rail (≥1024px): open calls + recent settlements. */
export function LeftRail({
  positions,
  spotUsd,
  onCashOut,
}: {
  positions: EnrichedPosition[];
  spotUsd: number | null;
  onCashOut: (id: string) => void;
}) {
  const open = positions.filter((p) => p.status === 'open');
  const closed = positions.filter((p) => p.status !== 'open').slice(0, 12);
  return (
    <aside className="hidden flex-col gap-3 lg:flex">
      <h2 className="px-1 text-[10px] font-black tracking-[0.14em] text-muted">OPEN CALLS</h2>
      {open.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-4 py-6 text-center">
          <div className="font-display text-[14px] text-muted">NO OPEN CALLS</div>
          <div className="mt-1 text-[11px] font-bold text-muted">The chart is waiting — make one.</div>
        </div>
      ) : (
        open.map((p) => <OpenCallCard key={p.id} position={p} spotUsd={spotUsd} onCashOut={onCashOut} />)
      )}

      <h2 className="mt-2 px-1 text-[10px] font-black tracking-[0.14em] text-muted">SETTLEMENTS</h2>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line bg-card p-2">
        {closed.length === 0 ? (
          <div className="py-5 text-center text-[11px] font-bold text-muted">Nothing settled yet</div>
        ) : (
          closed.map((p) => {
            const pnl = BigInt(p.payoutUnits ?? '0') - BigInt(p.costUnits);
            return (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5">
                <span style={{ color: p.market.isUp ? 'var(--up)' : 'var(--down)' }}>
                  {p.market.isUp ? '▲' : '▼'}
                </span>
                <span className="num flex-1 text-[11.5px] font-extrabold text-muted">
                  ${fmtUsd(fixedToUsdNum(p.market.strike), 0)}
                </span>
                <span className="text-[8.5px] font-black tracking-wide text-muted">
                  {p.status === 'won' ? 'WIN' : p.status === 'lost' ? 'LOSS' : 'EXIT'}
                </span>
                <span
                  className="num text-[11.5px] font-black"
                  style={{ color: pnl >= 0n ? 'var(--up)' : 'var(--down)' }}
                >
                  {pnl >= 0n ? '+' : ''}
                  {fmtDusdcUnits(pnl.toString())}
                </span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

/** Right rail (≥1024px): streak card + weekly board. */
export function RightRail({ streak }: { streak: number }) {
  const [rows, setRows] = useState<Array<{ userId: string; name: string | null; isBot: boolean; pnlUnits: string; streak: number }> | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const load = () => {
      api.leaderboard().then((res) => {
        setRows(res.rows?.slice(0, 9) ?? null);
        setYou(res.you);
      }).catch(() => {});
      api.profile().then((p) => setBest(p.stats?.streak.best ?? 0)).catch(() => {});
    };
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="hidden flex-col gap-3 lg:flex">
      <h2 className="px-1 text-[10px] font-black tracking-[0.14em] text-muted">YOUR STREAK</h2>
      <div className="rounded-2xl border border-line bg-card p-4">
        {streak > 0 ? (
          <div className="flex items-center gap-3">
            <StreakFlame streak={streak} size={26} />
            <div className="text-[12px] font-extrabold text-muted">
              best ×{Math.max(best, streak)} — keep it rolling
            </div>
          </div>
        ) : (
          <div>
            <div className="font-display text-[15px] text-muted">NO STREAK YET</div>
            <div className="text-[11px] font-bold text-muted">win a call to ignite the flame</div>
          </div>
        )}
      </div>

      <h2 className="mt-2 px-1 text-[10px] font-black tracking-[0.14em] text-muted">THIS WEEK&apos;S BOARD</h2>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line bg-card p-2">
        {!rows || rows.length === 0 ? (
          <div className="py-5 text-center text-[11px] font-bold text-muted">
            No settled calls yet this week
          </div>
        ) : (
          rows.map((row, i) => {
            const pnl = Number(BigInt(row.pnlUnits)) / 1e6;
            const isYou = row.userId === you;
            return (
              <div
                key={row.userId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={isYou ? { background: 'rgba(255,197,61,0.09)' } : undefined}
              >
                <span className="num w-5 text-center text-[11px] font-black text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-[11.5px] font-extrabold">
                  {isYou ? 'you' : row.name ?? shortAddr(row.userId)}
                  {row.isBot && (
                    <span className="ml-1 rounded border border-line px-1 text-[7.5px] font-black text-muted">BOT</span>
                  )}
                </span>
                {row.streak >= 2 && <StreakFlame streak={row.streak} size={11} />}
                <span className="num text-[11.5px] font-black" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {pnl >= 0 ? '+' : ''}
                  {pnl.toFixed(2)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
