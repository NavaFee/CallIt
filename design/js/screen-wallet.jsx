// screen-wallet.jsx — onboarding (Sui connect → faucet) + wallet sheet.

// ── flipping logo coin ──────────────────────────────────────
function LogoCoin({ size = 96, spin = true }) {
  return (
    <div style={{ perspective: 600, width: size, height: size }}>
      <div className="display" style={{
        width: size, height: size, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, color: '#5B3D00',
        background: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
        boxShadow: 'inset 0 -4px 0 #B97E0A, inset 0 4px 0 #FFEDB3, 0 10px 36px rgba(255,197,61,0.35)',
        border: '3px solid #E9A718',
        animation: spin ? 'ci-coin-spin calc(3.2s / max(var(--jscale,1), 0.2)) ease-in-out infinite' : 'none',
        transformStyle: 'preserve-3d',
      }}>▲</div>
    </div>
  );
}

// ── onboarding ──────────────────────────────────────────────
function OnboardingScreen({ game, onDone }) {
  const { useState, useEffect } = React;
  const { actions, profile } = game;
  const [stage, setStage] = useState('intro'); // intro | connecting | claim | claiming
  const [method, setMethod] = useState(null);

  const connect = (m) => {
    setMethod(m);
    setStage('connecting');
    setTimeout(() => { actions.connect(); setStage('claim'); }, 1500);
  };
  const claim = () => {
    setStage('claiming');
    setTimeout(() => { actions.faucet(); onDone(); }, 900);
  };

  return (
    <div data-screen-label="Onboarding" style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'radial-gradient(circle at 50% 22%, #131A2C, var(--bg) 70%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px', gap: 0,
    }}>
      <LogoCoin size={104} spin={stage !== 'connecting'} />
      <div className="display" style={{ fontSize: 46, marginTop: 18, letterSpacing: '0.02em' }}>
        Call<span style={{ color: 'var(--gold)' }}>It</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
        Call the market. Win the pot.
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {['15-MIN BTC CALLS', 'ON-CHAIN · SUI', 'AUTO PAYOUTS'].map(t => (
          <span key={t} style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--sui)',
            background: 'rgba(77,162,255,0.1)', border: '1px solid rgba(77,162,255,0.3)',
            borderRadius: 99, padding: '4px 9px',
          }}>{t}</span>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 300, marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 170 }}>
        {stage === 'intro' && (
          <React.Fragment>
            <ChunkyButton hue="sui" onClick={() => connect('wallet')} style={{ height: 58, width: '100%', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sui)', fontWeight: 1000, fontSize: 13 }}>S</span>
              <span className="display" style={{ fontSize: 17 }}>CONNECT SUI WALLET</span>
            </ChunkyButton>
            <ChunkyButton hue="dim" onClick={() => connect('zk')} style={{ height: 52, width: '100%' }}>
              <span style={{ fontWeight: 900, fontSize: 14 }}>Sign in with Google · zkLogin</span>
            </ChunkyButton>
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>
              Testnet — play money, real rails
            </div>
          </React.Fragment>
        )}
        {stage === 'connecting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '14px 0', animation: 'ci-pop 0.25s ease-out' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 99,
              border: '3.5px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--sui)',
              animation: 'ci-ring-spin 0.7s linear infinite',
            }}></div>
            <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--muted)' }}>
              {method === 'zk' ? 'Proving you, zero-knowledge style…' : 'Waking up your wallet…'}
            </span>
          </div>
        )}
        {(stage === 'claim' || stage === 'claiming') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'ci-rise 0.3s ease-out' }}>
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, color: 'var(--up)' }}>
              Connected ✓ <span className="num" style={{ color: 'var(--muted)', fontWeight: 800 }}>{profile.addr ? profile.addr.slice(0, 6) + '…' + profile.addr.slice(-4) : ''}</span>
            </div>
            <ChunkyButton hue="gold" onClick={claim} disabled={stage === 'claiming'} style={{ height: 60, width: '100%' }}>
              <span className="display" style={{ fontSize: 19 }}>
                {stage === 'claiming' ? 'POURING COINS…' : 'CLAIM 100 dUSDC'}
              </span>
            </ChunkyButton>
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>
              Free testnet stack from the faucet
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── wallet sheet ────────────────────────────────────────────
function WalletSheet({ game, onClose, desktop = false }) {
  const { profile, actions } = game;
  const panelStyle = desktop ? {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    width: 380, borderRadius: 26, border: '1px solid var(--line)',
    background: 'linear-gradient(180deg, #1A2133, #11151F)',
    padding: '20px 24px 28px', animation: 'ci-pop 0.28s cubic-bezier(0.2, 1.4, 0.4, 1)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  } : {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(180deg, #1A2133, #11151F)',
    borderRadius: '26px 26px 0 0', border: '1px solid var(--line)', borderBottom: 'none',
    padding: '12px 20px 46px', animation: 'ci-rise 0.28s cubic-bezier(0.2, 1, 0.4, 1)',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}></div>
      <div style={panelStyle}>
        {!desktop && <div style={{ width: 40, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 20 }}>WALLET</div>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--sui)',
            background: 'rgba(77,162,255,0.1)', border: '1px solid rgba(77,162,255,0.35)',
            borderRadius: 99, padding: '4px 10px',
          }}>SUI TESTNET</span>
        </div>
        <div style={{ textAlign: 'center', margin: '18px 0 6px' }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: 'var(--muted)' }}>BALANCE</div>
          <div className="display num" style={{ fontSize: 44, color: 'var(--gold)', textShadow: '0 0 24px rgba(255,197,61,0.25)' }}>
            {ciFmtUSD(profile.balance)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--muted)' }}>dUSDC</div>
        </div>
        <div className="num" style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--muted)', marginBottom: 18 }}>
          {profile.addr ? profile.addr.slice(0, 10) + '…' + profile.addr.slice(-6) : '—'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ChunkyButton hue="gold" onClick={actions.faucet} style={{ height: 54, width: '100%' }}>
            <span className="display" style={{ fontSize: 16 }}>FAUCET · +100 dUSDC</span>
          </ChunkyButton>
          <div style={{ display: 'flex', gap: 10 }}>
            <ChunkyButton hue="dim" onClick={() => { actions.resetAll(); onClose(); }} style={{ height: 46, flex: 1, fontSize: 13 }}>
              Reset progress
            </ChunkyButton>
            <ChunkyButton hue="dim" onClick={() => { actions.disconnect(); onClose(); }} style={{ height: 46, flex: 1, fontSize: 13 }}>
              Disconnect
            </ChunkyButton>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen, WalletSheet, LogoCoin });
