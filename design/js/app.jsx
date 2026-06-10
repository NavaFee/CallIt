// app.jsx — CallIt root: theme, scale-to-fit, tabs, overlays, tweaks.

const CALLIT_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Electric",
  "juice": 100,
  "demoSpeed": 30,
  "pitchMode": false,
  "layout": "Auto"
}/*EDITMODE-END*/;

function CallItHeader({ game, onOpenWallet }) {
  const { profile } = game;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoCoin size={28} spin={false} />
        <span className="display" style={{ fontSize: 22 }}>Call<span style={{ color: 'var(--gold)' }}>It</span></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {profile.streak > 0 && <StreakFlame streak={profile.streak} size={26} />}
        <button className="ci-pressable" onClick={onOpenWallet} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(255,197,61,0.1)', border: '1px solid rgba(255,197,61,0.4)',
          borderRadius: 999, padding: '5px 12px 5px 6px',
        }}>
          <BadgeCoin glyph="$" size={22} unlocked={true} />
          <span className="num" style={{ fontWeight: 1000, fontSize: 15, color: 'var(--gold)' }}>{ciFmtUSD(profile.balance)}</span>
        </button>
      </div>
    </div>
  );
}

function CallItTabBar({ tab, setTab }) {
  const tabs = [
    { id: 'play', label: 'Play', Icon: IconPlay },
    { id: 'ranks', label: 'Ranks', Icon: IconRanks },
    { id: 'you', label: 'You', Icon: IconUser },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: 'rgba(11,14,22,0.92)', backdropFilter: 'blur(10px)',
      borderTop: '1px solid var(--line)',
      padding: '6px 10px 30px', gap: 6, position: 'relative', zIndex: 20,
    }}>
      {tabs.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button key={id} className="ci-pressable" onClick={() => setTab(id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '7px 0 5px', borderRadius: 14,
            background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
          }}>
            <Icon active={active} />
            <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '0.04em', color: active ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CallItApp() {
  const { useState, useEffect } = React;
  const [t, setTweak] = useTweaks(CALLIT_TWEAK_DEFAULTS);
  const game = useCallItGame({ demoSpeed: t.demoSpeed, pitchMode: t.pitchMode });
  const [tab, setTab] = useState('play');
  const [walletOpen, setWalletOpen] = useState(false);
  const [onboard, setOnboard] = useState(() => !game.profile.connected);
  const [scale, setScale] = useState(1);
  const [vw, setVw] = useState(window.innerWidth);

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    if (!game.profile.connected) setOnboard(true);
  }, [game.profile.connected]);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 24) / 874, (window.innerWidth - 24) / 402));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const theme = CI_THEMES[t.theme] || CI_THEMES.Electric;
  const jscale = t.juice / 100;
  const themeVars = {
    '--up': theme.up, '--up-edge': theme.upEdge, '--up-glow': theme.upGlow, '--up-hi': theme.upHi,
    '--down': theme.down, '--down-edge': theme.downEdge, '--down-glow': theme.downGlow, '--down-hi': theme.downHi,
    '--jscale': jscale,
  };

  const isDesktop = t.layout === 'Desktop' || (t.layout === 'Auto' && vw >= 1024);

  const tweaks = (
    <TweaksPanel>
      <TweakSection label="Theme" />
      <TweakRadio label="Palette" value={t.theme} options={['Electric', 'Miami', 'Citrus']}
        onChange={(v) => setTweak('theme', v)} />
      <TweakRadio label="Layout" value={t.layout} options={['Auto', 'Phone', 'Desktop']}
        onChange={(v) => setTweak('layout', v)} />
      <TweakSection label="Feel" />
      <TweakSlider label="Juice" value={t.juice} min={0} max={150} step={5} unit="%"
        onChange={(v) => setTweak('juice', v)} />
      <TweakSlider label="Demo speed" value={t.demoSpeed} min={1} max={90} step={1} unit="×"
        onChange={(v) => setTweak('demoSpeed', v)} />
      <TweakToggle label="Pitch mode — next call always wins" value={t.pitchMode}
        onChange={(v) => setTweak('pitchMode', v)} />
    </TweaksPanel>
  );

  if (isDesktop) {
    return (
      <div style={{ height: '100vh', ...themeVars }}>
        <DesktopApp game={game} juice={jscale} walletOpen={walletOpen} setWalletOpen={setWalletOpen} onboard={onboard} />
        {tweaks}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, ...themeVars }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <IOSDevice dark width={402} height={874}>
          <div style={{
            position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'radial-gradient(circle at 50% -10%, #18203A, var(--bg) 55%)',
            fontFamily: 'var(--font-ui)', color: 'var(--text)', ...themeVars,
          }}>
            <div style={{ height: 62, flexShrink: 0 }}></div>
            <CallItHeader game={game} onOpenWallet={() => setWalletOpen(true)} />
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {tab === 'play' && <PlayScreen game={game} juice={jscale} />}
              {tab === 'ranks' && <RanksScreen game={game} />}
              {tab === 'you' && <ProfileScreen game={game} onOpenWallet={() => setWalletOpen(true)} />}
            </div>
            <CallItTabBar tab={tab} setTab={setTab} />

            {/* overlays */}
            {game.phase === 'settling' && game.round && (
              <SettleOverlay step={game.settleStep} side={game.round.side} />
            )}
            {game.phase === 'result' && game.result && (
              <ResultOverlay result={game.result} profile={game.profile} juice={jscale}
                onDismiss={game.actions.dismissResult} />
            )}
            {walletOpen && <WalletSheet game={game} onClose={() => setWalletOpen(false)} />}
            {onboard && <OnboardingScreen game={game} onDone={() => setOnboard(false)} />}
            <ToastStack toasts={game.toasts} />
          </div>
        </IOSDevice>
      </div>
      <div className="num" style={{ fontSize: 11, fontWeight: 700, color: '#3D465F', transform: `scale(${Math.max(scale, 0.8)})` }}>
        callit.markets · demo clock runs at {t.demoSpeed}× — a 15m round settles in ~{Math.round(900 / t.demoSpeed)}s
      </div>
      {tweaks}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CallItApp />);
