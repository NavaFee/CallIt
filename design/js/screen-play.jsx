// screen-play.jsx — main call screen: chart, odds, UP/DOWN, stake select,
// live round w/ cash-out, plus the settle + result overlays (the juice).

// ── big animated price ──────────────────────────────────────
function LivePrice({ feed }) {
  const animName = feed.dir > 0 ? 'ci-tick-up' : feed.dir < 0 ? 'ci-tick-down' : 'none';
  const [int, dec] = ciFmtPrice(feed.price).split('.');
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span key={feed.seq} className="display num" style={{ fontSize: 38, lineHeight: 1, animation: `${animName} 0.5s ease-out` }}>
        ${int}
      </span>
      <span className="display num" style={{ fontSize: 20, color: 'var(--muted)' }}>.{dec}</span>
    </div>
  );
}

function ChangeBadge({ feed, n = 30 }) {
  const ago = feed.hist[Math.max(0, feed.hist.length - n)];
  const delta = feed.price - ago;
  const up = delta >= 0;
  return (
    <div className="num" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: up ? 'var(--up-glow)' : 'var(--down-glow)',
      color: up ? 'var(--up)' : 'var(--down)',
      borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 900,
    }}>
      {up ? '▲' : '▼'} {ciFmtUSD(Math.abs(delta))}
    </div>
  );
}

// ── duration chips ──────────────────────────────────────────
function DurationChips({ duration, setDuration, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Object.keys(CI_DURATIONS).map(k => {
        const active = duration === k;
        return (
          <button key={k} className="ci-pressable" onClick={() => !disabled && setDuration(k)} style={{
            flex: 1, padding: '9px 0', borderRadius: 12,
            background: active ? 'linear-gradient(180deg, #2A3450, #1E2740)' : 'rgba(255,255,255,0.04)',
            border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--line)',
            color: active ? 'var(--gold)' : 'var(--muted)',
            fontWeight: 900, fontSize: 14, opacity: disabled && !active ? 0.35 : 1,
            boxShadow: active ? '0 0 14px rgba(255,197,61,0.18)' : 'none',
          }}>
            {k}
            <span style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: active ? 'rgba(255,197,61,0.7)' : 'rgba(139,147,172,0.6)' }}>EXPIRY</span>
          </button>
        );
      })}
    </div>
  );
}

// ── stake picker panel ──────────────────────────────────────
function StakePanel({ side, odds, balance, streak, onLock, onCancel }) {
  const { useState } = React;
  const presets = [1, 5, 10, 25];
  const [stake, setStake] = useState(() => presets.find(p => p <= balance) || 1);
  const boost = Math.min(streak * 0.05, 0.25);
  const payout = stake * odds * (1 + boost);
  const color = side === 'up' ? 'var(--up)' : 'var(--down)';
  return (
    <div style={{ animation: 'ci-rise 0.25s ease-out', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="display" style={{ fontSize: 20, color, whiteSpace: 'nowrap' }}>{side === 'up' ? '▲ CALLING UP' : '▼ CALLING DOWN'}</span>
          <span className="num" style={{ fontSize: 13, fontWeight: 900, color: 'var(--muted)' }}>×{odds.toFixed(2)}</span>
        </div>
        <button onClick={onCancel} style={{ color: 'var(--muted)', fontWeight: 900, fontSize: 13, padding: '4px 8px' }}>Cancel</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {presets.map(p => {
          const ok = p <= balance;
          const active = stake === p;
          return (
            <button key={p} className="ci-pressable num" disabled={!ok} onClick={() => setStake(p)} style={{
              flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 1000, fontSize: 17,
              background: active ? `linear-gradient(180deg, ${side === 'up' ? 'var(--up-hi)' : 'var(--down-hi)'}, ${color} 60%)` : 'rgba(255,255,255,0.05)',
              color: active ? (side === 'up' ? '#06291A' : '#2B0410') : ok ? 'var(--text)' : 'var(--muted)',
              border: active ? '1.5px solid transparent' : '1.5px solid var(--line)',
              opacity: ok ? 1 : 0.35,
              boxShadow: active ? `0 3px 0 ${side === 'up' ? 'var(--up-edge)' : 'var(--down-edge)'}` : 'none',
            }}>${p}</button>
          );
        })}
      </div>
      <ChunkyButton hue={side} onClick={() => onLock(stake)} disabled={stake > balance} style={{ height: 62, fontSize: 18, gap: 8, width: '100%' }}>
        <span className="display" style={{ fontSize: 20 }}>LOCK IT IN</span>
        <span className="num" style={{ fontSize: 14, fontWeight: 900, opacity: 0.75 }}>
          win {ciFmtUSD(payout)} dUSDC{boost > 0 ? ` (+${Math.round(boost * 100)}% streak)` : ''}
        </span>
      </ChunkyButton>
      {boost > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <StreakFlame streak={streak} size={16} showCount={false} /> Streak boost active: +{Math.round(boost * 100)}% on this win
        </div>
      )}
    </div>
  );
}

// ── locking beat ────────────────────────────────────────────
function LockingPanel({ side }) {
  const { useState, useEffect } = React;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const steps = ['Signing transaction…', 'Submitting to Sui…', 'Locked ✓'];
  const color = side === 'up' ? 'var(--up)' : 'var(--down)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '26px 0', animation: 'ci-pop 0.25s ease-out' }}>
      <div style={{
        width: 26, height: 26, borderRadius: 99, flexShrink: 0,
        border: '3px solid rgba(255,255,255,0.12)', borderTopColor: color,
        animation: 'ci-ring-spin 0.7s linear infinite',
      }}></div>
      <span key={step} style={{ fontWeight: 900, fontSize: 16, color: step === 2 ? color : 'var(--text)', animation: 'ci-rise 0.25s ease-out' }}>{steps[step]}</span>
    </div>
  );
}

// ── live round panel ────────────────────────────────────────
function LiveRoundPanel({ game, juice }) {
  const { useState, useRef, useEffect } = React;
  const { round, feed, actions } = game;
  const remaining = game.worldRemaining();
  const durSecs = CI_DURATIONS[round.duration].secs;
  const progress = ciClamp(1 - remaining / durSecs, 0, 1);
  const urgent = remaining < durSecs * 0.18;
  const winning = round.side === 'up' ? feed.price > round.lock : feed.price < round.lock;
  const delta = feed.price - round.lock;
  const value = ciCashoutValue(round, feed.price, remaining);
  const color = round.side === 'up' ? 'var(--up)' : 'var(--down)';

  // hold-to-cash-out
  const [hold, setHold] = useState(0);
  const holdRef = useRef(null);
  const startHold = () => {
    const t0 = Date.now();
    holdRef.current = setInterval(() => {
      const f = Math.min(1, (Date.now() - t0) / 650);
      setHold(f);
      if (f >= 1) { clearInterval(holdRef.current); actions.cashOut(); }
    }, 30);
  };
  const endHold = () => { clearInterval(holdRef.current); setHold(0); };
  useEffect(() => () => clearInterval(holdRef.current), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'ci-rise 0.3s ease-out' }}>
      {/* countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: 'var(--muted)' }}>ORACLE EXPIRY IN</div>
          <div className="display num" style={{
            fontSize: 44, lineHeight: 1.05,
            color: urgent ? 'var(--down)' : 'var(--text)',
            animation: urgent ? 'ci-blink calc(0.9s / max(var(--jscale,1), 0.2)) ease-in-out infinite' : 'none',
          }}>{ciFmtClock(remaining)}</div>
        </div>
        <div style={{
          textAlign: 'center', padding: '8px 14px', borderRadius: 14, whiteSpace: 'nowrap', flexShrink: 0,
          background: winning ? 'var(--up-glow)' : 'var(--down-glow)',
          animation: 'ci-pulse calc(1.3s / max(var(--jscale,1), 0.2)) ease-in-out infinite',
        }}>
          <div className="display" style={{ fontSize: 18, color: winning ? 'var(--up)' : 'var(--down)' }}>
            {winning ? 'WINNING' : 'BEHIND'}
          </div>
          <div className="num" style={{ fontSize: 11, fontWeight: 900, color: winning ? 'var(--up)' : 'var(--down)', opacity: 0.85 }}>
            {delta >= 0 ? '+' : '−'}${ciFmtUSD(Math.abs(delta))} vs lock
          </div>
        </div>
      </div>
      {/* progress bar */}
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress * 100}%`, borderRadius: 99,
          background: urgent ? 'linear-gradient(90deg, var(--gold), var(--down))' : `linear-gradient(90deg, var(--sui), ${color})`,
          transition: 'width 0.2s linear',
        }}></div>
      </div>
      {/* your call */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${color}`,
        boxShadow: `0 0 18px ${round.side === 'up' ? 'var(--up-glow)' : 'var(--down-glow)'}`,
      }}>
        <span className="display" style={{ fontSize: 22, color }}>{round.side === 'up' ? '▲' : '▼'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 1000, fontSize: 14, whiteSpace: 'nowrap' }}>
            {round.stake} dUSDC on {round.side.toUpperCase()} <span className="num" style={{ color: 'var(--muted)' }}>×{round.odds.toFixed(2)}</span>
          </div>
          <div className="num" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>locked @ ${ciFmtPrice(round.lock)}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--muted)' }}>TO WIN</div>
          <div className="display num" style={{ fontSize: 17, color: 'var(--gold)' }}>
            {ciFmtUSD(round.stake * round.odds * (1 + Math.min(round.streakBefore * 0.05, 0.25)))}
          </div>
        </div>
      </div>
      {/* hold to cash out */}
      <button
        className="ci-pressable"
        onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold}
        style={{
          height: 58, borderRadius: 16, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(180deg, #232B42, #1A2133)',
          border: '1.5px solid rgba(255,197,61,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 0 #0B0E18',
        }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${hold * 100}%`,
          background: 'linear-gradient(90deg, rgba(255,197,61,0.25), rgba(255,197,61,0.55))',
          transition: hold === 0 ? 'width 0.2s ease-out' : 'none',
        }}></div>
        <span style={{ position: 'relative', fontWeight: 1000, fontSize: 14, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
          {hold > 0 ? 'HOLD…' : 'HOLD TO CASH OUT'}
        </span>
        <span className="num" style={{ position: 'relative', fontWeight: 1000, fontSize: 16, color: 'var(--text)', whiteSpace: 'nowrap' }}>
          {ciFmtUSD(value)} dUSDC
        </span>
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>
        Early redeem priced off the live vol surface · settles instantly
      </div>
    </div>
  );
}

// ── idle: the two big buttons ───────────────────────────────
function CallButtons({ odds, onPick, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {['up', 'down'].map(side => (
        <ChunkyButton key={side} hue={side} edgeH={8} disabled={disabled} onClick={() => onPick(side)}
          style={{ flex: 1, height: 108, flexDirection: 'column', gap: 2, borderRadius: 22 }}>
          <span className="display" style={{ fontSize: 34, lineHeight: 1 }}>{side === 'up' ? '▲' : '▼'}</span>
          <span className="display" style={{ fontSize: 21, letterSpacing: '0.04em' }}>{side.toUpperCase()}</span>
          <span className="num" style={{ fontSize: 13, fontWeight: 1000, opacity: 0.7 }}>×{odds[side].toFixed(2)}</span>
        </ChunkyButton>
      ))}
    </div>
  );
}

// ── the play screen ─────────────────────────────────────────
function PlayScreen({ game, juice }) {
  const { useState, useEffect } = React;
  const { feed, odds, duration, phase, profile, actions } = game;
  const [picked, setPicked] = useState(null); // 'up' | 'down' | null
  useEffect(() => { if (phase === 'live' || phase === 'result') setPicked(null); }, [phase]);
  const inRound = phase === 'live' || phase === 'settling';

  return (
    <div data-screen-label="Play" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
      {/* chart card */}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>BTC · USD</span>
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--up)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--up)', animation: 'ci-glow-pulse 1.4s ease-in-out infinite', boxShadow: '0 0 6px var(--up)' }}></span>
                LIVE
              </span>
            </div>
            <LivePrice feed={feed} />
          </div>
          <ChangeBadge feed={feed} />
        </div>
        <Sparkline hist={feed.hist} lock={inRound && game.round ? game.round.lock : null} side={game.round ? game.round.side : null} width={358} height={140} />
      </Card>

      {/* round controls */}
      <Card>
        {phase === 'idle' && picked === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DurationChips duration={duration} setDuration={actions.setDuration} disabled={false} />
            <CallButtons odds={odds} onPick={setPicked} disabled={profile.balance < 1} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <OddsPill side="up" value={odds.up} seq={odds.seq} compact={true} />
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--muted)' }}>LIVE ODDS · VOL SURFACE</span>
              <OddsPill side="down" value={odds.down} seq={odds.seq} compact={true} />
            </div>
            {profile.balance < 1 && (
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>
                Balance empty — grab dUSDC from the faucet in your wallet
              </div>
            )}
          </div>
        )}
        {phase === 'idle' && picked !== null && (
          <StakePanel side={picked} odds={odds[picked]} balance={profile.balance} streak={profile.streak}
            onLock={(stake) => actions.placeCall(picked, stake)} onCancel={() => setPicked(null)} />
        )}
        {phase === 'locking' && <LockingPanel side={picked || 'up'} />}
        {(phase === 'live' || phase === 'settling') && game.round && <LiveRoundPanel game={game} juice={juice} />}
        {phase === 'settling' && !game.round && <div style={{ height: 80 }}></div>}
        {phase === 'result' && <div style={{ height: 120 }}></div>}
      </Card>
    </div>
  );
}

Object.assign(window, {
  PlayScreen, CallButtons, StakePanel, LockingPanel, LiveRoundPanel,
  DurationChips, LivePrice, ChangeBadge,
});
