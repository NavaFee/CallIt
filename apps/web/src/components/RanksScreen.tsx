'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { shortAddr } from '@/lib/format';
import { StreakFlame } from './StreakFlame';

interface Row {
  userId: string;
  name: string | null;
  isBot: boolean;
  pnlUnits: string;
  wins: number;
  calls: number;
  streak: number;
}

const MEDALS = ['#FFC53D', '#C8D2E8', '#D98E4A'];

export function RanksScreen() {
  const [rows, setRows] = useState<Row[] | null | undefined>(undefined);
  const [you, setYou] = useState<string | null>(null);

  useEffect(() => {
    api
      .leaderboard()
      .then((res) => {
        setRows(res.rows);
        setYou(res.you);
      })
      .catch(() => setRows(null));
    const t = setInterval(() => {
      api.leaderboard().then((res) => setRows(res.rows)).catch(() => {});
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  const yourRank = rows?.findIndex((r) => r.userId === you);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-28 pt-4" data-testid="ranks-screen">
      <div className="flex items-center justify-between rounded-3xl border border-line bg-card p-4">
        <div>
          <h1 className="font-display text-[20px]">THIS WEEK&apos;S BOARD</h1>
          <p className="text-[11px] font-bold text-muted">global · realized P&amp;L · resets Monday UTC</p>
        </div>
        {yourRank != null && yourRank >= 0 && (
          <div className="rounded-2xl bg-gold px-3 py-2 text-center" style={{ boxShadow: '0 4px 0 var(--gold-deep)' }}>
            <div className="text-[8px] font-black tracking-[0.1em] text-[#3A2700]">YOUR RANK</div>
            <div className="num font-display text-[22px] leading-none text-[#3A2700]">#{yourRank + 1}</div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-card p-2">
        {rows === undefined ? (
          <div className="py-8 text-center text-[12px] font-bold text-muted">loading…</div>
        ) : rows === null ? (
          <div className="py-8 text-center text-[12px] font-bold text-muted">
            Leaderboard warming up — play a few rounds and check back
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-bold text-muted">
            No settled calls this week yet — be the first on the board
          </div>
        ) : (
          rows.map((row, i) => {
            const isYou = row.userId === you;
            const pnl = Number(BigInt(row.pnlUnits)) / 1e6;
            return (
              <div
                key={row.userId}
                className="my-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2"
                style={
                  isYou
                    ? { background: 'rgba(255,197,61,0.09)', border: '1.5px solid rgba(255,197,61,0.5)' }
                    : undefined
                }
              >
                {i < 3 ? (
                  <span
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-display text-[12px] text-[#1A1206]"
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff6, transparent), ${MEDALS[i]}` }}
                  >
                    {i + 1}
                  </span>
                ) : (
                  <span className="num w-[26px] text-center text-[12px] font-black text-muted">{i + 1}</span>
                )}
                <span className={`flex-1 truncate text-[13px] ${isYou ? 'font-black' : 'font-extrabold'}`}>
                  {isYou ? 'you' : row.name ?? shortAddr(row.userId)}
                  {row.isBot ? (
                    <span className="ml-1.5 rounded border border-line px-1 text-[8px] font-black tracking-wide text-muted">
                      BOT
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] font-bold text-muted">
                      {row.wins}/{row.calls} wins
                    </span>
                  )}
                </span>
                {row.streak >= 2 && <StreakFlame streak={row.streak} size={13} />}
                <span
                  className="num text-[13px] font-black"
                  style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}
                >
                  {pnl >= 0 ? '+' : ''}
                  {pnl.toFixed(2)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
