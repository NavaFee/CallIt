// ui.jsx — CallIt shared atoms: themes, chunky buttons, sparkline chart,
// odds pills, streak flame, count-up, confetti, toasts, icons.

const CI_THEMES = {
  Electric: {
    up: '#00E07B', upEdge: '#067A45', upGlow: 'rgba(0,224,123,0.35)', upHi: '#5FFFB0',
    down: '#FF3D5E', downEdge: '#9E1430', downGlow: 'rgba(255,61,94,0.35)', downHi: '#FF8DA1',
  },
  Miami: {
    up: '#00D9FF', upEdge: '#01708C', upGlow: 'rgba(0,217,255,0.35)', upHi: '#7FEFFF',
    down: '#FF4FD8', downEdge: '#A01A85', downGlow: 'rgba(255,79,216,0.35)', downHi: '#FF9DEA',
  },
  Citrus: {
    up: '#B5E822', upEdge: '#5F8204', upGlow: 'rgba(181,232,34,0.35)', upHi: '#DDFF70',
    down: '#FF7A1C', downEdge: '#9C4203', downGlow: 'rgba(255,122,28,0.35)', downHi: '#FFB271',
  },
};

// ── chunky 3D arcade button ─────────────────────────────────
function ChunkyButton({ hue = 'dim', onClick, disabled, children, style, edgeH = 6, glow = true }) {
  const { useState } = React;
  const [pressed, setPressed] = useState(false);
  const palettes = {
    up:   { top: 'var(--up-hi)',  base: 'var(--up)',   edge: 'var(--up-edge)',   glow: 'var(--up-glow)',   text: '#06291A' },
    down: { top: 'var(--down-hi)', base: 'var(--down)', edge: 'var(--down-edge)', glow: 'var(--down-glow)', text: '#2B0410' },
    gold: { top: '#FFE08A', base: 'var(--gold)', edge: 'var(--gold-deep)', glow: 'rgba(255,197,61,0.4)', text: '#3A2700' },
    sui:  { top: '#8FC6FF', base: 'var(--sui)', edge: '#1B5FA8', glow: 'rgba(77,162,255,0.4)', text: '#04203D' },
    dim:  { top: '#222B42', base: '#1A2133', edge: '#0B0E18', glow: 'rgba(0,0,0,0)', text: 'var(--text)' },
  };
  const p = palettes[hue];
  const down2 = pressed && !disabled;
  return (
    <button
      className="ci-pressable"
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: `linear-gradient(180deg, ${p.top} 0%, ${p.base} 42%)`,
        color: p.text,
        borderRadius: 18,
        boxShadow: down2
          ? `0 1px 0 ${p.edge}`
          : `0 ${edgeH}px 0 ${p.edge}${glow ? `, 0 ${edgeH + 6}px 26px ${p.glow}` : ''}`,
        transform: down2 ? `translateY(${edgeH - 1}px) scale(0.985)` : 'translateY(0)',
        opacity: disabled ? 0.45 : 1,
        filter: disabled ? 'saturate(0.4)' : 'none',
        fontFamily: 'var(--font-ui)', fontWeight: 900,
        whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── count-up number ─────────────────────────────────────────
function CountUp({ to, dp = 2, duration = 1400, prefix = '', suffix = '', delay = 0, className = '', style }) {
  const { useState, useEffect, useRef } = React;
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const t0 = setTimeout(() => {
      const step = (ts) => {
        if (start === null) start = ts;
        const f = Math.min(1, (ts - start) / duration);
        const e = 1 - Math.pow(1 - f, 3);
        setVal(to * e);
        if (f < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf.current); };
  }, [to]);
  return <span className={'num ' + className} style={style}>{prefix}{ciFmtUSD(val, dp)}{suffix}</span>;
}

// ── live price sparkline ────────────────────────────────────
function Sparkline({ hist, lock, side, width = 358, height = 150, livePulse = true }) {
  const pad = 6;
  const min = Math.min(...hist, lock || Infinity);
  const max = Math.max(...hist, lock || -Infinity);
  const span = Math.max(max - min, 0.0001);
  const x = (i) => pad + (i / (hist.length - 1)) * (width - pad * 2);
  const y = (v) => pad + (1 - (v - min) / span) * (height - pad * 2 - 8) + 4;
  const pts = hist.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = hist[hist.length - 1];
  const lastUp = lock != null ? last >= lock : hist[hist.length - 1] >= hist[hist.length - 2];
  const lineColor = lock != null ? (lastUp ? 'var(--up)' : 'var(--down)') : 'var(--sui)';
  const fillColor = lock != null ? (lastUp ? 'var(--up-glow)' : 'var(--down-glow)') : 'rgba(77,162,255,0.25)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ci-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${height - pad} ${pts} ${width - pad},${height - pad}`} fill="url(#ci-spark-fill)" stroke="none"></polygon>
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></polyline>
      {lock != null && (
        <g>
          <line x1={pad} y1={y(lock)} x2={width - pad} y2={y(lock)} stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.9"></line>
          <rect x={width - 78} y={y(lock) - 10} width="72" height="20" rx="10" fill="var(--gold)"></rect>
          <text x={width - 42} y={y(lock) + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#3A2700" fontFamily="var(--font-ui)">{'LOCK ' + (side === 'up' ? '▲' : '▼')}</text>
        </g>
      )}
      <circle cx={x(hist.length - 1)} cy={y(last)} r="4" fill={lineColor}></circle>
      {livePulse && (
        <circle cx={x(hist.length - 1)} cy={y(last)} r="4" fill="none" stroke={lineColor} strokeWidth="2" opacity="0.6">
          <animate attributeName="r" values="4;11" dur="1.2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite"></animate>
        </circle>
      )}
    </svg>
  );
}

// ── odds pill (shimmers when surface refreshes) ─────────────
function OddsPill({ side, value, seq, compact = false }) {
  const { useEffect, useRef, useState } = React;
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [seq]);
  const color = side === 'up' ? 'var(--up)' : 'var(--down)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)',
      borderRadius: 999, padding: compact ? '3px 10px' : '5px 12px',
      position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ color, fontSize: compact ? 11 : 12, fontWeight: 900 }}>{side === 'up' ? '▲' : '▼'}</span>
      <span className="num" style={{ fontWeight: 1000, fontSize: compact ? 13 : 15, color: 'var(--text)' }}>×{value.toFixed(2)}</span>
      {flash && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '45%', left: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
          animation: 'ci-shimmer 0.9s ease-out',
        }}></div>
      )}
    </div>
  );
}

// ── streak flame ────────────────────────────────────────────
function StreakFlame({ streak, size = 30, showCount = true, animate = true }) {
  if (streak <= 0) return null;
  const tier = streak >= 7 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
  const cores = [
    ['#FFC53D', '#FF8A1E'],
    ['#FF9A1E', '#FF4D1C'],
    ['#FF5A2B', '#E8143C'],
    ['#9D5CFF', '#4DA2FF'],
  ][tier];
  return (
    <div style={{ position: 'relative', width: size, height: size * 1.15, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', bottom: size * 0.05, width: size * 0.82, height: size * 0.82,
        background: `linear-gradient(135deg, ${cores[0]}, ${cores[1]})`,
        borderRadius: '4% 50% 50% 50%',
        transform: 'rotate(45deg)',
        animation: animate ? 'ci-flame calc(0.7s / max(var(--jscale, 1), 0.2)) ease-in-out infinite' : 'none',
        boxShadow: `0 0 ${size * 0.45}px ${cores[1]}66`,
      }}></div>
      <div style={{
        position: 'absolute', bottom: size * 0.13, width: size * 0.46, height: size * 0.46,
        background: 'linear-gradient(135deg, #FFF6D9, #FFD66B)',
        borderRadius: '4% 50% 50% 50%', transform: 'rotate(45deg)',
        animation: animate ? 'ci-flame calc(0.55s / max(var(--jscale, 1), 0.2)) ease-in-out infinite reverse' : 'none',
      }}></div>
      {showCount && (
        <span className="display num" style={{
          position: 'relative', zIndex: 1, fontSize: size * 0.46, color: '#3A1800',
          paddingBottom: size * 0.12, textShadow: '0 1px 0 rgba(255,255,255,0.45)',
        }}>{streak}</span>
      )}
    </div>
  );
}

// ── confetti / coin shower canvas ───────────────────────────
function ConfettiBurst({ count = 160, coins = true, duration = 3000, width = 402, height = 874 }) {
  const { useRef, useEffect } = React;
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || count <= 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#FFC53D', '#FFFFFF', getComputedStyle(canvas).getPropertyValue('--up').trim() || '#00E07B', '#4DA2FF', '#FF8A1E'];
    const parts = [];
    for (let i = 0; i < count; i++) {
      const isCoin = coins && i % 4 === 0;
      const a = (Math.random() * Math.PI) - Math.PI / 2 - Math.PI / 4;
      const v = 7 + Math.random() * 13;
      parts.push({
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: height * 0.38,
        vx: Math.cos(a) * v * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(a) * v - Math.random() * 6,
        w: isCoin ? 9 + Math.random() * 6 : 5 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
        coin: isCoin,
        wob: Math.random() * Math.PI * 2,
      });
    }
    let start = null, raf;
    const step = (ts) => {
      if (start === null) start = ts;
      const t = ts - start;
      ctx.clearRect(0, 0, width, height);
      const fade = t > duration - 600 ? Math.max(0, (duration - t) / 600) : 1;
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.992;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.wob += 0.1;
        if (p.coin) {
          const squish = Math.abs(Math.cos(p.wob));
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.fillStyle = '#B97E0A';
          ctx.beginPath(); ctx.ellipse(0, 1.5, p.w, p.w * squish, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFC53D';
          ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.w * squish, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFE08A';
          ctx.beginPath(); ctx.ellipse(0, 0, p.w * 0.55, p.w * 0.55 * squish, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2);
          ctx.restore();
        }
      }
      if (t < duration) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width, height, pointerEvents: 'none', zIndex: 5 }}></canvas>;
}

// ── toasts ──────────────────────────────────────────────────
function ToastStack({ toasts, desktop = false }) {
  return (
    <div style={desktop ? {
      position: 'absolute', right: 24, bottom: 24, width: 360, zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    } : {
      position: 'absolute', left: 16, right: 16, bottom: 110, zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.kind === 'badge' ? 'linear-gradient(180deg, #2A2410, #1C1809)' : 'rgba(20,25,39,0.96)',
          border: '1px solid ' + (t.kind === 'badge' ? 'rgba(255,197,61,0.5)' : 'var(--line)'),
          borderRadius: 14, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'ci-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)',
          fontSize: 13, fontWeight: 800,
        }}>
          {t.kind === 'badge' ? (
            <React.Fragment>
              <BadgeCoin glyph={t.badge.glyph} size={30} unlocked={true} />
              <div>
                <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em' }}>BADGE UNLOCKED</div>
                <div style={{ color: 'var(--text)' }}>{t.badge.name} — {t.badge.desc}</div>
              </div>
            </React.Fragment>
          ) : t.kind === 'money' ? (
            <React.Fragment>
              <BadgeCoin glyph="$" size={26} unlocked={true} />
              <span style={{ color: 'var(--gold)' }} className="num">{t.text}</span>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--sui)', boxShadow: '0 0 8px var(--sui)', flexShrink: 0 }}></span>
              <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="num">{t.text}</span>
            </React.Fragment>
          )}
        </div>
      ))}
    </div>
  );
}

// ── gold badge coin ─────────────────────────────────────────
function BadgeCoin({ glyph, size = 44, unlocked = false }) {
  return (
    <div className="display" style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42,
      background: unlocked
        ? 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)'
        : 'radial-gradient(circle at 32% 28%, #232B42, #161C2E)',
      color: unlocked ? '#5B3D00' : '#39415C',
      boxShadow: unlocked
        ? 'inset 0 -2px 0 #B97E0A, inset 0 2px 0 #FFEDB3, 0 3px 8px rgba(255,197,61,0.3)'
        : 'inset 0 -2px 0 #0A0D16, inset 0 2px 0 #232B42',
      border: unlocked ? '2px solid #E9A718' : '2px solid #232B42',
    }}>{glyph}</div>
  );
}

// ── tab bar icons (simple geometry only) ────────────────────
function IconPlay({ active }) {
  const c = active ? 'var(--gold)' : 'var(--muted)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 3 L19 12 L5 12 Z" fill={active ? 'var(--up)' : c}></path>
      <path d="M12 21 L5 14 L19 14 Z" fill={active ? 'var(--down)' : c} opacity={active ? 1 : 0.55}></path>
    </svg>
  );
}
function IconRanks({ active }) {
  const c = active ? 'var(--gold)' : 'var(--muted)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="3.5" y="11" width="5" height="9" rx="1.5" fill={c} opacity="0.75"></rect>
      <rect x="9.5" y="5" width="5" height="15" rx="1.5" fill={c}></rect>
      <rect x="15.5" y="14" width="5" height="6" rx="1.5" fill={c} opacity="0.55"></rect>
    </svg>
  );
}
function IconUser({ active }) {
  const c = active ? 'var(--gold)' : 'var(--muted)';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="8.5" r="4" fill={c}></circle>
      <path d="M4.5 20 C4.5 15.5 8 13.8 12 13.8 C16 13.8 19.5 15.5 19.5 20 Z" fill={c} opacity="0.8"></path>
    </svg>
  );
}

// ── section card ────────────────────────────────────────────
function Card({ children, style, pad = 14 }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--card-2), var(--card))',
      border: '1px solid var(--line)',
      borderRadius: 20, padding: pad,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  CI_THEMES, ChunkyButton, CountUp, Sparkline, OddsPill, StreakFlame,
  ConfettiBurst, ToastStack, BadgeCoin, IconPlay, IconRanks, IconUser, Card,
});
