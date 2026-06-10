// overlays.jsx — settlement sequence + win/lose/cash-out celebration.
// Rendered full-bleed inside the device, above the tab bar.

// ── settling: oracle expiry → keeper claim ──────────────────
function SettleOverlay({ step, side }) {
  const color = side === 'up' ? 'var(--up)' : 'var(--down)';
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(7,9,15,0.88)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      animation: 'ci-pop 0.2s ease-out',
    }}>
      <div style={{ position: 'relative', width: 92, height: 92 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 999,
          border: '4px solid rgba(255,255,255,0.08)', borderTopColor: step === 0 ? 'var(--gold)' : 'var(--sui)',
          animation: 'ci-ring-spin 0.8s linear infinite',
        }}></div>
        <div className="display" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, color: step === 0 ? 'var(--gold)' : 'var(--sui)',
        }}>{step === 0 ? '◷' : '⛓'}</div>
      </div>
      <div key={step} style={{ textAlign: 'center', animation: 'ci-rise 0.3s ease-out' }}>
        <div className="display" style={{ fontSize: 26, letterSpacing: '0.03em' }}>
          {step === 0 ? 'ORACLE EXPIRY HIT' : 'KEEPER SETTLING…'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', marginTop: 6 }}>
          {step === 0 ? 'Final price snapshotting on-chain' : 'Payout auto-claims — you do nothing'}
        </div>
      </div>
      <div className="display" style={{ fontSize: 15, color, letterSpacing: '0.06em' }}>
        YOUR CALL: {side === 'up' ? '▲ UP' : '▼ DOWN'}
      </div>
    </div>
  );
}

// ── result: the celebration ─────────────────────────────────
function ResultOverlay({ result, profile, onDismiss, juice, vw = 402, vh = 874 }) {
  const { useEffect, useState } = React;
  const r = result;
  const win = r.type === 'win';
  const cash = r.type === 'cashout';
  const positive = win || (cash && r.pnl >= 0);
  const confettiCount = Math.round((win ? 190 : cash && positive ? 70 : 0) * juice);
  const [shaking, setShaking] = useState(!win && !cash);
  useEffect(() => {
    if (shaking) { const t = setTimeout(() => setShaking(false), 600); return () => clearTimeout(t); }
  }, []);

  const accent = win ? 'var(--up)' : cash ? 'var(--gold)' : 'var(--down)';
  const title = win ? 'CALLED IT!' : cash ? 'CASHED OUT' : 'MISSED CALL';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 45, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: win
        ? 'radial-gradient(circle at 50% 36%, rgba(0,224,123,0.16), rgba(7,9,15,0.96) 65%)'
        : cash
          ? 'radial-gradient(circle at 50% 36%, rgba(255,197,61,0.13), rgba(7,9,15,0.96) 65%)'
          : 'rgba(7,9,15,0.95)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* screen flash on win */}
      {win && juice > 0 && (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--up)', pointerEvents: 'none', opacity: 0,
          animation: 'ci-flash 0.5s ease-out forwards', zIndex: 2,
        }}></div>
      )}
      {confettiCount > 0 && <ConfettiBurst count={confettiCount} coins={win} width={vw} height={vh} />}

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        width: '100%', padding: '0 28px', position: 'relative', zIndex: 10,
        animation: shaking ? 'ci-shake 0.55s ease-out' : 'none',
      }}>
        {/* streak flame crowns the win */}
        {win && r.streakAfter > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, animation: 'ci-pop 0.5s cubic-bezier(0.2,1.6,0.4,1) 0.45s backwards' }}>
            <StreakFlame streak={r.streakAfter} size={42} />
            <div style={{ textAlign: 'left' }}>
              <div className="display" style={{ fontSize: 16, color: 'var(--gold)', letterSpacing: '0.05em' }}>WIN STREAK ×{r.streakAfter}</div>
              {r.streakAfter >= 1 && (
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)' }}>
                  next win pays +{Math.round(Math.min(r.streakAfter * 5, 25))}% extra
                </div>
              )}
            </div>
          </div>
        )}

        <div className="display" style={{
          fontSize: win ? 52 : 42, lineHeight: 1, color: accent, textAlign: 'center',
          textShadow: win ? '0 0 34px var(--up-glow)' : 'none',
          animation: 'ci-pop-big 0.55s cubic-bezier(0.2,1.5,0.4,1)',
        }}>{title}</div>

        {/* payout */}
        <div style={{ marginTop: 14, textAlign: 'center', animation: 'ci-rise 0.4s ease-out 0.25s backwards' }}>
          {positive ? (
            <CountUp to={r.payout} prefix="+" suffix=" dUSDC" delay={350} duration={1100}
              className="display" style={{ fontSize: 40, color: 'var(--gold)', textShadow: '0 0 26px rgba(255,197,61,0.4)' }} />
          ) : (
            <span className="display num" style={{ fontSize: 36, color: 'var(--down)' }}>
              −{ciFmtUSD(r.stake)} dUSDC
            </span>
          )}
          <div className="num" style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', marginTop: 6 }}>
            {win && (
              <span>{r.stake} staked × {r.odds.toFixed(2)}{r.boost > 0 ? ` × ${(1 + r.boost).toFixed(2)} streak boost` : ''}</span>
            )}
            {cash && <span>redeemed early off the live surface{r.pnl >= 0 ? ` · +${ciFmtUSD(r.pnl)} profit` : ` · ${ciFmtUSD(r.pnl)} saved from worse`}</span>}
            {!win && !cash && r.streakBefore > 0 && (
              <span style={{ color: 'var(--down)' }}>streak of {r.streakBefore} burned out</span>
            )}
            {!win && !cash && r.streakBefore === 0 && <span>the market had other plans</span>}
          </div>
        </div>

        {/* settle detail */}
        <div style={{
          marginTop: 18, display: 'flex', gap: 18, alignItems: 'center',
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '10px 18px', animation: 'ci-rise 0.4s ease-out 0.4s backwards',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>LOCKED</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 1000 }}>${ciFmtPrice(r.lock)}</div>
          </div>
          <span className="display" style={{ fontSize: 18, color: accent }}>→</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--muted)' }}>{cash ? 'EXITED' : 'SETTLED'}</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 1000, color: r.settle >= r.lock ? 'var(--up)' : 'var(--down)' }}>${ciFmtPrice(r.settle)}</div>
          </div>
        </div>

        {/* keeper line */}
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 800, color: 'var(--muted)', whiteSpace: 'nowrap',
          animation: 'ci-rise 0.4s ease-out 0.55s backwards',
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: 99, background: positive ? 'var(--up)' : 'rgba(255,255,255,0.15)',
            color: '#06291A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 1000, flexShrink: 0,
          }}>✓</span>
          {positive ? 'Payout auto-claimed by keeper' : 'Settled by keeper'} · tx {ciShortTx(r.tx)} · Sui testnet
        </div>

        {/* new balance */}
        <div className="num" style={{ marginTop: 16, fontSize: 13, fontWeight: 900, color: 'var(--text)', opacity: 0.85, animation: 'ci-rise 0.4s ease-out 0.65s backwards' }}>
          Balance: <span style={{ color: 'var(--gold)' }}>{ciFmtUSD(profile.balance)} dUSDC</span>
        </div>

        <ChunkyButton hue={win ? 'gold' : cash ? 'sui' : 'dim'} onClick={onDismiss}
          style={{ marginTop: 24, height: 58, width: '100%', maxWidth: 280, fontSize: 18, animation: 'ci-rise 0.4s ease-out 0.75s backwards' }}>
          <span className="display" style={{ fontSize: 20, letterSpacing: '0.04em' }}>
            {win ? 'KEEP ROLLING' : cash ? 'BACK TO THE CHART' : 'RUN IT BACK'}
          </span>
        </ChunkyButton>
      </div>
    </div>
  );
}

Object.assign(window, { SettleOverlay, ResultOverlay });
