// screen-desktop.jsx — game-HUD layout for ≥1024px viewports.
// Left rail: open call + settlements feed · Center: big chart + call panel
// Right rail: streak card + daily leaderboard · Slim top bar.

function useCIWidth(ref) {
  const { useState, useEffect } = React;
  const [w, setW] = useState(0);
  useEffect(() => {
    const measure = () => { if (ref.current) setW(ref.current.clientWidth); };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      ro = new ResizeObserver(measure);
      ro.observe(ref.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, []);
  return w;
}

function RailTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 8px' }}>
      <span className="display" style={{ fontSize: 15, letterSpacing: '0.05em', color: 'var(--text)' }}>{children}</span>
      {right}
    </div>
  );
}

// ── top bar ─────────────────────────────────────────────────
function DesktopTopBar({ game, onOpenWallet }) {
  const { profile, feed } = game;
  return (
    <div style={{
      height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 18,
      padding: '0 22px', borderBottom: '1px solid var(--line)',
      background: 'rgba(11,14,22,0.85)', backdropFilter: 'blur(10px)', zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <LogoCoin size={30} spin={false} />
        <span className="display" style={{ fontSize: 24 }}>Call<span style={{ color: 'var(--gold)' }}>It</span></span>
      </div>
      <div className="num" style={{
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900,
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 14px',
      }}>
        <span style={{ color: 'var(--muted)', letterSpacing: '0.08em', fontSize: 10 }}>BTC</span>
        <span key={feed.seq} style={{ animation: feed.dir > 0 ? 'ci-tick-up 0.5s ease-out' : feed.dir < 0 ? 'ci-tick-down 0.5s ease-out' : 'none' }}>
          ${ciFmtPrice(feed.price)}
        </span>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--up)', boxShadow: '0 0 6px var(--up)', animation: 'ci-glow-pulse 1.4s ease-in-out infinite' }}></span>
      </div>
      <div style={{ flex: 1 }}></div>
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--sui)',
        background: 'rgba(77,162,255,0.1)', border: '1px solid rgba(77,162,255,0.35)',
        borderRadius: 99, padding: '4px 10px',
      }}>SUI TESTNET</span>
      {profile.streak > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StreakFlame streak={profile.streak} size={24} />
        </div>
      )}
      <button className="ci-pressable" onClick={onOpenWallet} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,197,61,0.1)', border: '1px solid rgba(255,197,61,0.4)',
        borderRadius: 999, padding: '5px 14px 5px 6px',
      }}>
        <BadgeCoin glyph="$" size={24} unlocked={true} />
        <span className="num" style={{ fontWeight: 1000, fontSize: 15, color: 'var(--gold)' }}>{ciFmtUSD(profile.balance)}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)' }}>dUSDC</span>
      </button>
    </div>
  );
}

// ── left rail ───────────────────────────────────────────────
function OpenCallCard({ game }) {
  const { round, feed } = game;
  if (!round) {
    return (
      <Card style={{ textAlign: 'center', padding: '22px 14px' }}>
        <div className="display" style={{ fontSize: 15, color: 'var(--muted)' }}>NO OPEN CALLS</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', marginTop: 4, opacity: 0.7 }}>
          The chart is waiting — make one.
        </div>
      </Card>
    );
  }
  const remaining = game.worldRemaining();
  const winning = round.side === 'up' ? feed.price > round.lock : feed.price < round.lock;
  const color = round.side === 'up' ? 'var(--up)' : 'var(--down)';
  return (
    <Card style={{ border: `1.5px solid ${color}`, boxShadow: `0 0 20px ${round.side === 'up' ? 'var(--up-glow)' : 'var(--down-glow)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="display" style={{ fontSize: 24, color }}>{round.side === 'up' ? '▲' : '▼'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="num" style={{ fontWeight: 1000, fontSize: 14, whiteSpace: 'nowrap' }}>
            {round.stake} dUSDC · ×{round.odds.toFixed(2)} · {round.duration}
          </div>
          <div className="num" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>@ ${ciFmtPrice(round.lock)}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 10, flexShrink: 0,
          background: winning ? 'var(--up-glow)' : 'var(--down-glow)',
        }}>
          <span className="display" style={{ fontSize: 12, color: winning ? 'var(--up)' : 'var(--down)' }}>
            {winning ? 'WINNING' : 'BEHIND'}
          </span>
        </div>
      </div>
      <div className="display num" style={{ fontSize: 26, marginTop: 8, textAlign: 'center' }}>{ciFmtClock(remaining)}</div>
    </Card>
  );
}

function DesktopLeftRail({ game }) {
  const { profile } = game;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
      <div>
        <RailTitle>OPEN CALL</RailTitle>
        <OpenCallCard game={game} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <RailTitle right={<span className="num" style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted)' }}>{profile.history.length} total</span>}>
          SETTLEMENTS
        </RailTitle>
        <Card pad={4} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {profile.history.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>
              Settled calls land here — keeper-claimed, automatically.
            </div>
          ) : (
            profile.history.slice(0, 14).map(h => <HistoryRow key={h.tx} h={h} />)
          )}
        </Card>
      </div>
    </div>
  );
}

// ── center stage ────────────────────────────────────────────
function DesktopCenter({ game, juice }) {
  const { useState, useEffect, useRef } = React;
  const { feed, odds, duration, phase, profile, actions } = game;
  const [picked, setPicked] = useState(null);
  useEffect(() => { if (phase === 'live' || phase === 'result') setPicked(null); }, [phase]);
  const chartRef = useRef(null);
  const chartW = useCIWidth(chartRef);
  const inRound = phase === 'live' || phase === 'settling';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, minWidth: 0 }}>
      <Card pad={0} style={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>BTC · USD</span>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--up)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--up)', animation: 'ci-glow-pulse 1.4s ease-in-out infinite', boxShadow: '0 0 6px var(--up)' }}></span>
                LIVE
              </span>
            </div>
            <LivePrice feed={feed} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OddsPill side="up" value={odds.up} seq={odds.seq} />
            <OddsPill side="down" value={odds.down} seq={odds.seq} />
            <ChangeBadge feed={feed} />
          </div>
        </div>
        <div ref={chartRef} style={{ width: '100%', flex: 1, minHeight: 200, display: 'flex', alignItems: 'flex-end' }}>
          {chartW > 0 && (
            <Sparkline hist={feed.hist} lock={inRound && game.round ? game.round.lock : null}
              side={game.round ? game.round.side : null} width={chartW}
              height={Math.max(200, Math.min(420, (chartRef.current ? chartRef.current.clientHeight : 260)))} />
          )}
        </div>
      </Card>

      <Card style={{ flexShrink: 0 }}>
        {phase === 'idle' && picked === null && (
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 14, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>ORACLE EXPIRY</div>
              <DurationChips duration={duration} setDuration={actions.setDuration} disabled={false} />
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>odds refresh off the live vol surface</div>
            </div>
            <CallButtons odds={odds} onPick={setPicked} disabled={profile.balance < 1} />
          </div>
        )}
        {phase === 'idle' && picked !== null && (
          <StakePanel side={picked} odds={odds[picked]} balance={profile.balance} streak={profile.streak}
            onLock={(stake) => actions.placeCall(picked, stake)} onCancel={() => setPicked(null)} />
        )}
        {phase === 'locking' && <LockingPanel side={picked || 'up'} />}
        {(phase === 'live' || phase === 'settling') && game.round && <LiveRoundPanel game={game} juice={juice} />}
        {(phase === 'settling' || phase === 'result') && !game.round && <div style={{ height: 90 }}></div>}
        {phase === 'idle' && picked === null && profile.balance < 1 && (
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold)', marginTop: 10 }}>
            Balance empty — grab dUSDC from the faucet in your wallet
          </div>
        )}
      </Card>
    </div>
  );
}

// ── right rail ──────────────────────────────────────────────
function DesktopStreakCard({ profile }) {
  const boost = Math.min(profile.streak * 5, 25);
  const winRate = profile.calls > 0 ? Math.round((profile.wins / profile.calls) * 100) : 0;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {profile.streak > 0
          ? <StreakFlame streak={profile.streak} size={44} />
          : <div style={{ opacity: 0.3, filter: 'saturate(0)' }}><StreakFlame streak={1} size={44} showCount={false} animate={false} /></div>}
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18 }}>
            {profile.streak > 0 ? `WIN STREAK ×${profile.streak}` : 'NO STREAK YET'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: profile.streak > 0 ? 'var(--gold)' : 'var(--muted)' }}>
            {profile.streak > 0 ? `next win pays +${boost}% extra` : 'win a call to ignite the flame'}
          </div>
        </div>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', margin: '12px 0 4px' }}>
        <div style={{
          height: '100%', width: `${(boost / 25) * 100}%`, borderRadius: 99,
          background: 'linear-gradient(90deg, var(--gold), #FF8A1E)', transition: 'width 0.4s ease',
        }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.06em' }}>
        <span>BOOST +{boost}%</span><span>MAX +25%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        {[['WIN RATE', winRate + '%', winRate >= 50 && profile.calls > 0 ? 'var(--up)' : 'var(--text)'],
          ['CALLS', String(profile.calls), 'var(--text)'],
          ['NET P&L', (profile.netPnl >= 0 ? '+' : '−') + ciFmtUSD(Math.abs(profile.netPnl), 1), profile.netPnl >= 0 ? 'var(--up)' : 'var(--down)']
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: 11, padding: '7px 9px' }}>
            <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--muted)' }}>{l}</div>
            <div className="display num" style={{ fontSize: 16, color: c, marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DesktopLeaderboard({ game }) {
  const { profile, bots } = game;
  const rows = bots
    .map(b => ({ name: b.name, profit: b.profit, streak: b.streak, you: false }))
    .concat([{ name: 'You', profit: profile.dayProfit, streak: profile.streak, you: true }])
    .sort((a, b) => b.profit - a.profit);
  const youRank = rows.findIndex(r => r.you) + 1;
  const medals = ['#FFC53D', '#C8D2E8', '#D98E4A'];
  const top = rows.slice(0, 9);
  const youInTop = top.some(r => r.you);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <RailTitle right={<span className="num" style={{ fontSize: 10, fontWeight: 900, color: 'var(--gold)' }}>you're #{youRank}</span>}>
        TODAY'S BOARD
      </RailTitle>
      <Card pad={5} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {top.map((r) => {
          const i = rows.indexOf(r);
          return (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 11,
              background: r.you ? 'rgba(255,197,61,0.09)' : 'transparent',
              border: r.you ? '1.5px solid rgba(255,197,61,0.5)' : '1.5px solid transparent',
            }}>
              {i < 3 ? (
                <div className="display num" style={{
                  width: 22, height: 22, borderRadius: 99, flexShrink: 0, fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle at 35% 30%, #fff5, ${medals[i]})`, color: '#1A1206',
                }}>{i + 1}</div>
              ) : (
                <div className="num" style={{ width: 22, textAlign: 'center', fontSize: 11, fontWeight: 900, color: 'var(--muted)', flexShrink: 0 }}>{i + 1}</div>
              )}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: r.you ? 1000 : 800, fontSize: 13, color: r.you ? 'var(--gold)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {r.streak >= 2 && <StreakFlame streak={r.streak} size={13} showCount={false} animate={false} />}
              </div>
              <span className="num" style={{ fontWeight: 1000, fontSize: 13, color: r.profit >= 0 ? 'var(--up)' : 'var(--down)', flexShrink: 0 }}>
                {r.profit >= 0 ? '+' : '−'}{ciFmtUSD(Math.abs(r.profit))}
              </span>
            </div>
          );
        })}
        {!youInTop && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 11, marginTop: 2,
            background: 'rgba(255,197,61,0.09)', border: '1.5px solid rgba(255,197,61,0.5)',
          }}>
            <div className="num" style={{ width: 22, textAlign: 'center', fontSize: 11, fontWeight: 900, color: 'var(--gold)', flexShrink: 0 }}>{youRank}</div>
            <span style={{ flex: 1, fontWeight: 1000, fontSize: 13, color: 'var(--gold)' }}>You</span>
            <span className="num" style={{ fontWeight: 1000, fontSize: 13, color: profile.dayProfit >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {profile.dayProfit >= 0 ? '+' : '−'}{ciFmtUSD(Math.abs(profile.dayProfit))}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── desktop root ────────────────────────────────────────────
function DesktopApp({ game, juice, walletOpen, setWalletOpen, onboard }) {
  return (
    <div data-screen-label="Desktop HUD" style={{
      position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(1200px circle at 50% -10%, #18203A, var(--bg) 60%)',
      color: 'var(--text)', fontFamily: 'var(--font-ui)', overflow: 'hidden',
    }}>
      <DesktopTopBar game={game} onOpenWallet={() => setWalletOpen(true)} />
      <div style={{
        flex: 1, minHeight: 0, display: 'grid',
        gridTemplateColumns: 'minmax(280px, 330px) minmax(0, 1fr) minmax(300px, 360px)',
        gap: 16, padding: 16, maxWidth: 1560, width: '100%', margin: '0 auto',
      }}>
        <DesktopLeftRail game={game} />
        <DesktopCenter game={game} juice={juice} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <div>
            <RailTitle>YOUR STREAK</RailTitle>
            <DesktopStreakCard profile={game.profile} />
          </div>
          <DesktopLeaderboard game={game} />
        </div>
      </div>

      {game.phase === 'settling' && game.round && (
        <SettleOverlay step={game.settleStep} side={game.round.side} />
      )}
      {game.phase === 'result' && game.result && (
        <ResultOverlay result={game.result} profile={game.profile} juice={juice}
          vw={window.innerWidth} vh={window.innerHeight}
          onDismiss={game.actions.dismissResult} />
      )}
      {walletOpen && <WalletSheet game={game} onClose={() => setWalletOpen(false)} desktop={true} />}
      {onboard && <OnboardingScreen game={game} onDone={() => {}} />}
      <ToastStack toasts={game.toasts} desktop={true} />
    </div>
  );
}

Object.assign(window, { DesktopApp });
