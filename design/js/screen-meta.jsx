// screen-meta.jsx — leaderboard (Ranks) + profile/history (You).

function ciTimeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function ciDayResetClock() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return ciFmtClock((end - now) / 1000);
}

// ── ranks ───────────────────────────────────────────────────
function RanksScreen({ game }) {
  const { profile, bots } = game;
  const rows = bots
    .map(b => ({ name: b.name, profit: b.profit, streak: b.streak, you: false }))
    .concat([{ name: 'You', profit: profile.dayProfit, streak: profile.streak, you: true }])
    .sort((a, b) => b.profit - a.profit);
  const youRank = rows.findIndex(r => r.you) + 1;
  const medals = ['#FFC53D', '#C8D2E8', '#D98E4A'];

  return (
    <div data-screen-label="Ranks" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
      <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="display" style={{ fontSize: 22 }}>TODAY'S BOARD</div>
          <div className="num" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>resets in {ciDayResetClock()} · daily P&amp;L</div>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,197,61,0.1)', border: '1px solid rgba(255,197,61,0.35)', borderRadius: 14, padding: '6px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--gold)' }}>YOUR RANK</div>
          <div className="display num" style={{ fontSize: 24, color: 'var(--gold)' }}>#{youRank}</div>
        </div>
      </Card>

      <Card pad={6}>
        {rows.map((r, i) => (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            borderRadius: 13,
            background: r.you ? 'rgba(255,197,61,0.09)' : 'transparent',
            border: r.you ? '1.5px solid rgba(255,197,61,0.5)' : '1.5px solid transparent',
            margin: '1px 0',
          }}>
            {i < 3 ? (
              <div className="display num" style={{
                width: 26, height: 26, borderRadius: 99, flexShrink: 0, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle at 35% 30%, #fff5, ${medals[i]})`,
                color: '#1A1206', boxShadow: `0 2px 6px ${medals[i]}55`,
              }}>{i + 1}</div>
            ) : (
              <div className="num" style={{ width: 26, textAlign: 'center', fontSize: 12, fontWeight: 900, color: 'var(--muted)', flexShrink: 0 }}>{i + 1}</div>
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ fontWeight: r.you ? 1000 : 800, fontSize: 14, color: r.you ? 'var(--gold)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {r.streak >= 2 && <StreakFlame streak={r.streak} size={15} showCount={false} animate={false} />}
            </div>
            <span className="num" style={{ fontWeight: 1000, fontSize: 14, color: r.profit >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {r.profit >= 0 ? '+' : '−'}{ciFmtUSD(Math.abs(r.profit))}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── profile / you ───────────────────────────────────────────
function StatCell({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>{label}</div>
      <div className="display num" style={{ fontSize: 21, marginTop: 2, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

function HistoryRow({ h }) {
  const color = h.side === 'up' ? 'var(--up)' : 'var(--down)';
  const resLabel = h.result === 'win' ? 'WIN' : h.result === 'loss' ? 'LOSS' : 'CASH-OUT';
  const resColor = h.result === 'win' ? 'var(--up)' : h.result === 'loss' ? 'var(--down)' : 'var(--gold)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderBottom: '1px solid var(--line)' }}>
      <span className="display" style={{ fontSize: 18, color, width: 20, textAlign: 'center', flexShrink: 0 }}>{h.side === 'up' ? '▲' : '▼'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="num" style={{ fontWeight: 1000, fontSize: 13.5 }}>{h.stake} dUSDC · ×{h.odds.toFixed(2)}</span>
          <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--muted)', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '1px 7px' }}>{h.duration}</span>
        </div>
        <div className="num" style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', marginTop: 1 }}>
          {ciTimeAgo(h.ts)} · tx {ciShortTx(h.tx)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 1000, letterSpacing: '0.08em', color: resColor }}>{resLabel}</div>
        <div className="num" style={{ fontWeight: 1000, fontSize: 14, color: h.pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
          {h.pnl >= 0 ? '+' : '−'}{ciFmtUSD(Math.abs(h.pnl))}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ game, onOpenWallet }) {
  const { profile } = game;
  const winRate = profile.calls > 0 ? Math.round((profile.wins / profile.calls) * 100) : 0;
  return (
    <div data-screen-label="Profile" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
      {/* identity */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="display" style={{
          width: 54, height: 54, borderRadius: 999, flexShrink: 0, fontSize: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--sui), #2E5FBF)', color: '#fff',
          boxShadow: '0 4px 14px rgba(77,162,255,0.35)',
        }}>Y</div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 20 }}>you.sui</div>
          <div className="num" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>
            {profile.addr ? profile.addr.slice(0, 6) + '…' + profile.addr.slice(-4) : '—'} · Sui testnet
          </div>
        </div>
        <button className="ci-pressable" onClick={onOpenWallet} style={{
          padding: '8px 14px', borderRadius: 12, fontWeight: 900, fontSize: 12,
          background: 'rgba(77,162,255,0.12)', border: '1px solid rgba(77,162,255,0.4)', color: 'var(--sui)',
        }}>Wallet</button>
      </Card>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCell label="WIN RATE" value={winRate + '%'} color={winRate >= 50 ? 'var(--up)' : 'var(--text)'} />
        <StatCell label="BEST STREAK" value={'×' + profile.bestStreak} color="var(--gold)" />
        <StatCell label="TOTAL CALLS" value={profile.calls} />
        <StatCell label="NET P&L" value={(profile.netPnl >= 0 ? '+' : '−') + ciFmtUSD(Math.abs(profile.netPnl))} color={profile.netPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
      </div>

      {/* badges */}
      <Card>
        <div className="display" style={{ fontSize: 16, marginBottom: 10 }}>BADGES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {CI_BADGES.map(b => {
            const unlocked = profile.badges.includes(b.id);
            return (
              <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: unlocked ? 1 : 0.55 }}>
                <BadgeCoin glyph={b.glyph} size={46} unlocked={unlocked} />
                <div style={{ fontSize: 10.5, fontWeight: 900, color: unlocked ? 'var(--text)' : 'var(--muted)', textAlign: 'center' }}>{b.name}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>{b.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* history */}
      <Card pad={6}>
        <div className="display" style={{ fontSize: 16, margin: '8px 10px 4px' }}>CALL HISTORY</div>
        {profile.history.length === 0 ? (
          <div style={{ padding: '18px 10px 22px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>
            No calls yet — the chart is waiting.
          </div>
        ) : (
          profile.history.map(h => <HistoryRow key={h.tx} h={h} />)
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { RanksScreen, ProfileScreen, ciTimeAgo, HistoryRow, StatCell });
