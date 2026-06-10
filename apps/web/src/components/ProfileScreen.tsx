'use client';

import { useEffect, useState } from 'react';
import { api, type PositionWire } from '@/lib/api';
import { fixedToUsdNum, fmtDusdcUnits, fmtUsd, shortAddr } from '@/lib/format';
import { StreakFlame } from './StreakFlame';

const BADGES = [
  { type: 'first', name: 'First Call', description: 'Place your first call', glyph: '▲' },
  { type: 'hat', name: 'Hat Trick', description: 'Win 3 in a row', glyph: '3×' },
  { type: 'fire', name: 'On Fire', description: 'Hit a 5-win streak', glyph: '5×' },
  { type: 'exit', name: 'Smooth Exit', description: 'Cash out a live call', glyph: '⤴' },
  { type: 'whale', name: 'High Roller', description: 'Stake 25 dUSDC at once', glyph: '◆' },
  { type: 'sharp', name: 'Sharp Caller', description: 'Win 10 calls total', glyph: '★' },
];

interface Stats {
  calls: number;
  wins: number;
  cashouts: number;
  netPnlUnits: string;
  streak: { current: number; best: number };
  badges: string[];
}

function BadgeCoin({ unlocked, glyph, size = 46 }: { unlocked: boolean; glyph: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-display"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: unlocked
          ? 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)'
          : 'radial-gradient(circle at 32% 28%, #232B42, #161C2E)',
        boxShadow: unlocked
          ? 'inset 0 -2px 0 #B97E0A, inset 0 2px 0 #FFEDB3, 0 3px 8px rgba(255,197,61,0.3)'
          : 'inset 0 -2px 0 #0A0D16, inset 0 2px 0 #232B42',
        border: `2px solid ${unlocked ? '#E9A718' : '#232B42'}`,
        color: unlocked ? '#5B3D00' : '#39415C',
      }}
    >
      {glyph}
    </div>
  );
}

export function ProfileScreen({ address }: { address: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<PositionWire[]>([]);

  useEffect(() => {
    api.profile().then((res) => setStats(res.stats)).catch(() => {});
    api.positions().then((res) => setHistory(res.positions.filter((p) => p.status !== 'open'))).catch(() => {});
  }, []);

  const winRate = stats && stats.calls > 0 ? Math.round((stats.wins / stats.calls) * 100) : 0;
  const pnl = stats ? Number(BigInt(stats.netPnlUnits)) / 1e6 : 0;
  const unlocked = new Set(stats?.badges ?? []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-28 pt-4" data-testid="profile-screen">
      {/* identity */}
      <div className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4">
        <div
          className="flex h-[54px] w-[54px] items-center justify-center rounded-full font-display text-[22px] text-[#04203D]"
          style={{ background: 'linear-gradient(180deg, #8FC6FF, #4DA2FF)' }}
        >
          Y
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-black">you.sui</div>
          <div className="num text-[11px] font-bold text-muted">{address ? shortAddr(address) : '—'}</div>
        </div>
        {stats && stats.streak.current > 0 && <StreakFlame streak={stats.streak.current} />}
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'WIN RATE', value: `${winRate}%` },
          { label: 'BEST STREAK', value: `×${stats?.streak.best ?? 0}` },
          { label: 'TOTAL CALLS', value: String(stats?.calls ?? 0) },
          {
            label: 'NET P&L',
            value: `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`,
            color: pnl >= 0 ? 'var(--up)' : 'var(--down)',
          },
        ].map((cell) => (
          <div key={cell.label} className="rounded-2xl border border-line bg-white/[0.04] px-3 py-2.5">
            <div className="text-[9px] font-black tracking-[0.12em] text-muted">{cell.label}</div>
            <div className="num font-display text-[21px]" style={{ color: cell.color }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>

      {/* badges */}
      <div className="rounded-3xl border border-line bg-card p-4">
        <h2 className="text-[10px] font-black tracking-[0.14em] text-muted">BADGES</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const has = unlocked.has(b.type);
            return (
              <div key={b.type} className="flex flex-col items-center gap-1 text-center" style={{ opacity: has ? 1 : 0.55 }}>
                <BadgeCoin unlocked={has} glyph={b.glyph} />
                <div className="text-[10.5px] font-black">{b.name}</div>
                <div className="text-[9px] font-bold text-muted">{b.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* history */}
      <div className="rounded-3xl border border-line bg-card p-2">
        <h2 className="px-2 pt-2 text-[10px] font-black tracking-[0.14em] text-muted">CALL HISTORY</h2>
        {history.length === 0 ? (
          <div className="py-6 text-center text-[12px] font-bold text-muted">
            No calls yet — the chart is waiting
          </div>
        ) : (
          history.map((p) => {
            const payout = BigInt(p.payoutUnits ?? '0');
            const pnlRow = payout - BigInt(p.costUnits);
            const label = p.status === 'won' ? 'WIN' : p.status === 'lost' ? 'LOSS' : 'CASH-OUT';
            return (
              <div key={p.id} className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="text-[16px]" style={{ color: p.market.isUp ? 'var(--up)' : 'var(--down)' }}>
                  {p.market.isUp ? '▲' : '▼'}
                </span>
                <div className="flex-1">
                  <div className="text-[12.5px] font-extrabold">
                    {fmtDusdcUnits(p.costUnits)} on {p.market.isUp ? 'ABOVE' : 'AT/BELOW'} $
                    <span className="num">{fmtUsd(fixedToUsdNum(p.market.strike), 0)}</span>
                  </div>
                  <div className="text-[10px] font-bold text-muted">
                    {new Date(p.settledAt ?? p.placedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-muted">{label}</div>
                  <div className="num text-[13px] font-black" style={{ color: pnlRow >= 0n ? 'var(--up)' : 'var(--down)' }}>
                    {pnlRow >= 0n ? '+' : ''}
                    {fmtDusdcUnits(pnlRow.toString())}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
