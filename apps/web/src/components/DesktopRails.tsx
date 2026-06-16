'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { fixedToUsdNum, fmtDusdcUnits, fmtUsd, shortAddr } from '@/lib/format';
import type { EnrichedPosition } from './OpenCalls';
import { OpenCallCard } from './OpenCalls';
import { StreakFlame } from './StreakFlame';

const cardStyle = {
  background: 'linear-gradient(180deg, var(--card-2), var(--card))',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
};

function RailTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-0.5">
      <h2 className="font-display text-[15px] tracking-[0.05em] text-ink">{children}</h2>
      {right}
    </div>
  );
}

/** Left rail (≥1024px): open calls + recent settlements. */
export function LeftRail({
  positions,
  spotFor,
  onCashOut,
}: {
  positions: EnrichedPosition[];
  spotFor: (oracleId: string) => number | null;
  onCashOut: (id: string) => void;
}) {
  const open = positions.filter((p) => p.status === 'open');
  const closed = positions.filter((p) => p.status !== 'open').slice(0, 12);
  return (
    <aside className="hidden min-h-0 flex-col gap-3.5 lg:flex lg:h-full overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div className="shrink-0">
        <RailTitle>OPEN CALLS</RailTitle>
        {open.length === 0 ? (
          <div className="rounded-[20px] border border-line px-4 py-[22px] text-center" style={cardStyle}>
            <div className="font-display text-[15px] text-muted">NO OPEN CALLS</div>
            <div className="mt-1 text-[12px] font-extrabold text-muted opacity-70">The chart is waiting — make one.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {open.map((p) => (
              <OpenCallCard key={p.id} position={p} spotUsd={spotFor(p.market.oracleId)} onCashOut={onCashOut} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <RailTitle>SETTLEMENTS</RailTitle>
        <div className="rounded-[20px] border border-line p-1 min-h-[300px]" style={cardStyle}>
          {closed.length === 0 ? (
            <div className="px-3 py-5 text-center text-[12px] font-extrabold text-muted">
              Settled calls land here automatically.
            </div>
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
      </div>
    </aside>
  );
}

/** Right rail (≥1024px): streak card + weekly board. */
export function RightRail({ streak }: { streak: number }) {
  const [rows, setRows] = useState<Array<{ userId: string; name: string | null; isBot: boolean; pnlUnits: string; streak: number }> | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    calls: number;
    wins: number;
    losses: number;
    netPnlUnits: string;
    streak: { current: number; best: number };
  } | null>(null);

  useEffect(() => {
    const load = () => {
      api.leaderboard().then((res) => {
        setRows(res.rows ?? null);
        setYou(res.you);
      }).catch(() => {});
      api.profile().then((p) => setStats(p.stats ?? null)).catch(() => {});
    };
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  const winRateBase = (stats?.wins ?? 0) + (stats?.losses ?? 0);
  const winRate = winRateBase > 0 ? Math.round(((stats?.wins ?? 0) / winRateBase) * 100) : 0;
  const boardRows = rows
    ? [
        ...rows.slice(0, 8),
        ...rows.filter((row, index) => index >= 8 && !row.isBot),
      ]
    : null;

  return (
    <aside className="hidden min-h-0 flex-col gap-3.5 lg:flex lg:h-full overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div className="shrink-0">
        <RailTitle>YOUR STREAK</RailTitle>
        <div className="rounded-[20px] border border-line p-4" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="-ml-3 mr-3 shrink-0 flex items-center">
              {streak > 0 ? (
                <StreakFlame streak={streak} size={36} />
              ) : (
                <span className="opacity-30 saturate-0">
                  <StreakFlame streak={1} size={36} showCount={false} animate={false} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[18px] text-ink">
                {streak > 0 ? `WIN STREAK ×${streak}` : 'NO STREAK YET'}
              </div>
              <div className="text-[11px] font-black text-muted">
                {streak > 0
                  ? `best ×${Math.max(stats?.streak.best ?? 0, streak)} — keep it rolling`
                  : 'win a call to ignite the flame'}
              </div>
            </div>
          </div>
          <div className="my-3 h-[7px] overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((streak / Math.max(stats?.streak.best ?? streak, 1)) * 100, 100)}%`,
                background: 'linear-gradient(90deg, var(--gold), #FF8A1E)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['WIN RATE', `${winRate}%`, winRate >= 50 && winRateBase > 0 ? 'var(--up)' : 'var(--text)'],
              ['CALLS', String(stats?.calls ?? 0), 'var(--text)'],
              ['NET P&L', `${Number(BigInt(stats?.netPnlUnits ?? '0')) >= 0 ? '+' : ''}${fmtDusdcUnits(stats?.netPnlUnits ?? '0')}`, Number(BigInt(stats?.netPnlUnits ?? '0')) >= 0 ? 'var(--up)' : 'var(--down)'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-[11px] border border-line bg-white/[0.04] px-2 py-1.5">
                <div className="text-[8.5px] font-black tracking-[0.1em] text-muted">{label}</div>
                <div className="num font-display text-[16px]" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <RailTitle>THIS WEEK&apos;S BOARD</RailTitle>
        <div className="rounded-[20px] border border-line p-1.5 min-h-[300px]" style={cardStyle}>
          {!boardRows || boardRows.length === 0 ? (
            <div className="py-5 text-center text-[11px] font-bold text-muted">
              No settled calls yet this week
            </div>
          ) : (
            boardRows.map((row) => {
              const pnl = Number(BigInt(row.pnlUnits)) / 1e6;
              const isYou = row.userId === you;
              const rank = rows ? rows.findIndex((r) => r.userId === row.userId) + 1 : 0;
              return (
                <div
                  key={row.userId}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={isYou ? { background: 'rgba(255,197,61,0.09)' } : undefined}
                >
                  <span className="num w-5 text-center text-[11px] font-black text-muted">{rank}</span>
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
      </div>
    </aside>
  );
}
