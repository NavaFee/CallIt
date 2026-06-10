// engine.jsx — CallIt game engine: price feed, odds surface, round lifecycle,
// persistence, badges, leaderboard bots, toasts.
// Exports to window at bottom.

const CI_STORE_KEY = 'callit_v1';

const CI_DURATIONS = {
  '5m':  { secs: 300,  label: '5m'  },
  '15m': { secs: 900,  label: '15m' },
  '1h':  { secs: 3600, label: '1h'  },
};

const CI_BADGES = [
  { id: 'first', name: 'First Call', desc: 'Place your first call', glyph: '▲' },
  { id: 'hat',   name: 'Hat Trick',  desc: 'Win 3 in a row',        glyph: '3×' },
  { id: 'fire',  name: 'On Fire',    desc: 'Hit a 5-win streak',    glyph: '5×' },
  { id: 'exit',  name: 'Smooth Exit',desc: 'Cash out a live call',  glyph: '⤴' },
  { id: 'whale', name: 'High Roller',desc: 'Stake 25 dUSDC at once',glyph: '◆' },
  { id: 'sharp', name: 'Sharp Caller', desc: 'Win 10 calls total',  glyph: '★' },
];

const CI_BOT_SEED = [
  ['OracleOtter', 212.40], ['VolVixen', 168.22], ['SuiSensei', 141.95],
  ['MoonCaller', 98.10], ['ThetaThief', 76.55], ['CandleCat', 61.04],
  ['GammaGoose', 44.80], ['BlockBird', 31.27], ['PumpPenguin', 19.60],
  ['DeltaDuck', 8.15], ['DipDolphin', -4.42], ['SatoshiSnail', -12.90],
  ['KeeperKoala', -27.35], ['TickTockTrader', -41.08],
];

function ciClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ciGauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; }
function ciMakeTx() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function ciShortTx(tx) { return tx.slice(0, 4) + '…' + tx.slice(-4); }
function ciFmtUSD(v, dp = 2) {
  const sign = v < 0 ? '-' : '';
  return sign + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function ciFmtPrice(v) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function ciFmtClock(secs) {
  secs = Math.max(0, Math.ceil(secs));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return m + ':' + String(s).padStart(2, '0');
}

function ciDefaultProfile() {
  return {
    connected: false, addr: null,
    balance: 0, streak: 0, bestStreak: 0,
    wins: 0, calls: 0, netPnl: 0, dayProfit: 0,
    cashouts: 0, maxStake: 0,
    badges: [], history: [],
  };
}
function ciLoadProfile() {
  try {
    const raw = localStorage.getItem(CI_STORE_KEY);
    if (raw) return { ...ciDefaultProfile(), ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return ciDefaultProfile();
}
function ciSaveProfile(p) {
  try { localStorage.setItem(CI_STORE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
}

function ciCheckBadges(profile) {
  const has = new Set(profile.badges);
  const fresh = [];
  const tests = {
    first: profile.calls >= 1,
    hat:   profile.bestStreak >= 3,
    fire:  profile.bestStreak >= 5,
    exit:  profile.cashouts >= 1,
    whale: profile.maxStake >= 25,
    sharp: profile.wins >= 10,
  };
  for (const b of CI_BADGES) {
    if (tests[b.id] && !has.has(b.id)) { has.add(b.id); fresh.push(b); }
  }
  return { badges: Array.from(has), fresh };
}

function ciSeedFeed() {
  let p = 104318.50;
  const hist = [];
  let mom = 0;
  for (let i = 0; i < 90; i++) {
    mom = mom * 0.86 + ciGauss() * 0.9;
    p += p * ((mom * 2.4 + ciGauss() * 4.5) / 10000) * 0.55;
    hist.push(p);
  }
  return { price: p, prev: p, dir: 0, hist, seq: 0 };
}

// ───────────────────────────────────────────────────────────────
// The one hook. Owns all game state.
// ───────────────────────────────────────────────────────────────
function useCallItGame(tweaks) {
  const { useState, useRef, useEffect, useCallback } = React;
  const speed = tweaks.demoSpeed; // world-seconds per real second

  const [profile, setProfile] = useState(ciLoadProfile);
  const [feed, setFeed] = useState(ciSeedFeed);
  const [odds, setOdds] = useState({ up: 1.94, down: 2.12, seq: 0 });
  const [duration, setDuration] = useState('15m');
  const [phase, setPhase] = useState('idle'); // idle | locking | live | settling | result
  const [round, setRound] = useState(null);
  const [settleStep, setSettleStep] = useState(0);
  const [result, setResult] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [bots, setBots] = useState(() => CI_BOT_SEED.map(([name, profit], i) => ({
    name, profit, id: i, streak: Math.max(0, Math.floor(ciGauss() * 3 + 1)),
  })));
  const [clockTick, setClockTick] = useState(0); // forces countdown re-render

  const momRef = useRef(0);
  const pUpRef = useRef(0.515);
  const phaseRef = useRef(phase);   phaseRef.current = phase;
  const roundRef = useRef(round);   roundRef.current = round;
  const feedRef = useRef(feed);     feedRef.current = feed;
  const profileRef = useRef(profile); profileRef.current = profile;
  const speedRef = useRef(speed);   speedRef.current = speed;
  const pitchRef = useRef(false);   pitchRef.current = !!tweaks.pitchMode || !!window.__callitRig;
  const oddsRef = useRef(odds);     oddsRef.current = odds;

  useEffect(() => { ciSaveProfile(profile); }, [profile]);

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, ...toast }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), toast.ttl || 3200);
  }, []);

  // ── price feed ──
  useEffect(() => {
    const iv = setInterval(() => {
      momRef.current = momRef.current * 0.86 + ciGauss() * 0.9;
      setFeed(f => {
        const deltaBps = (momRef.current * 2.4 + ciGauss() * 4.5) * 0.55;
        const next = f.price + f.price * (deltaBps / 10000);
        const hist = f.hist.slice(-89).concat(next);
        return { price: next, prev: f.price, dir: next > f.price ? 1 : next < f.price ? -1 : 0, hist, seq: f.seq + 1 };
      });
    }, 600);
    return () => clearInterval(iv);
  }, []);

  // ── odds surface (SVI-flavored drift) ──
  useEffect(() => {
    const iv = setInterval(() => {
      pUpRef.current = ciClamp(pUpRef.current + ciGauss() * 0.012 - momRef.current * 0.004, 0.41, 0.59);
      const vig = 1.045;
      const up = ciClamp(1 / (pUpRef.current * vig), 1.55, 2.45);
      const down = ciClamp(1 / ((1 - pUpRef.current) * vig), 1.55, 2.45);
      setOdds(o => ({ up: Math.round(up * 100) / 100, down: Math.round(down * 100) / 100, seq: o.seq + 1 }));
    }, 4200);
    return () => clearInterval(iv);
  }, []);

  // ── countdown ticker during live round ──
  useEffect(() => {
    if (phase !== 'live') return;
    const iv = setInterval(() => setClockTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [phase]);

  const worldRemaining = useCallback(() => {
    const r = roundRef.current;
    if (!r) return 0;
    const elapsed = (Date.now() - r.startReal) / 1000 * speedRef.current;
    return CI_DURATIONS[r.duration].secs - elapsed;
  }, []);

  // ── settle check ──
  useEffect(() => {
    if (phase !== 'live' || !round) return;
    if (worldRemaining() <= 0) beginSettle();
  });

  function applyOutcome(updater) {
    const before = profileRef.current;
    let after = updater({ ...before });
    const { badges, fresh } = ciCheckBadges(after);
    after = { ...after, badges };
    setProfile(after);
    fresh.forEach((b, i) => setTimeout(() => pushToast({ kind: 'badge', badge: b }), 600 + i * 900));
    return { after, fresh };
  }

  function beginSettle() {
    const r = roundRef.current;
    if (!r || phaseRef.current !== 'live') return;
    let settlePrice = feedRef.current.price;
    if (pitchRef.current) {
      const r0 = roundRef.current;
      const mag = Math.max(Math.abs(settlePrice - r0.lock), r0.lock * 0.0004);
      settlePrice = r0.lock + (r0.side === 'up' ? mag : -mag);
    }
    setPhase('settling');
    setSettleStep(0);
    setTimeout(() => setSettleStep(1), 900);
    setTimeout(() => {
      const win = r.side === 'up' ? settlePrice > r.lock : settlePrice < r.lock;
      const boost = Math.min(r.streakBefore * 0.05, 0.25);
      const payout = win ? r.stake * r.odds * (1 + boost) : 0;
      const pnl = payout - r.stake;
      const claimTx = ciMakeTx();
      const { fresh } = applyOutcome(p => {
        p.calls += 1;
        p.wins += win ? 1 : 0;
        p.streak = win ? p.streak + 1 : 0;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        p.balance += payout;
        p.netPnl += pnl;
        p.dayProfit += pnl;
        p.history = [{
          id: r.tx, side: r.side, stake: r.stake, odds: r.odds, lock: r.lock,
          settle: settlePrice, result: win ? 'win' : 'loss', pnl,
          duration: r.duration, ts: Date.now(), tx: claimTx,
        }].concat(p.history).slice(0, 60);
        return p;
      });
      setResult({
        type: win ? 'win' : 'loss', side: r.side, stake: r.stake, odds: r.odds,
        payout, pnl, lock: r.lock, settle: settlePrice, boost,
        streakBefore: r.streakBefore,
        streakAfter: win ? r.streakBefore + 1 : 0,
        tx: claimTx, newBadges: fresh,
      });
      setRound(null);
      setPhase('result');
    }, 2100);
  }

  // ── actions ──
  const actions = {
    setDuration,
    connect() {
      const addr = '0x' + Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')).join('');
      setProfile(p => ({ ...p, connected: true, addr }));
    },
    disconnect() {
      setProfile(p => ({ ...p, connected: false }));
      setPhase('idle'); setRound(null); setResult(null);
    },
    faucet() {
      setProfile(p => ({ ...p, balance: p.balance + 100 }));
      pushToast({ kind: 'money', text: '+100.00 dUSDC from testnet faucet' });
    },
    resetAll() {
      const fresh = ciDefaultProfile();
      setProfile(fresh); setPhase('idle'); setRound(null); setResult(null);
    },
    placeCall(side, stake) {
      const p = profileRef.current;
      if (phaseRef.current !== 'idle' || stake <= 0 || stake > p.balance) return;
      const lockedOdds = side === 'up' ? oddsRef.current.up : oddsRef.current.down;
      setPhase('locking');
      setProfile(pp => ({ ...pp, balance: pp.balance - stake, maxStake: Math.max(pp.maxStake, stake) }));
      const tx = ciMakeTx();
      setTimeout(() => {
        setRound({
          side, stake, odds: lockedOdds, duration,
          lock: feedRef.current.price,
          startReal: Date.now(),
          streakBefore: profileRef.current.streak,
          tx,
        });
        setPhase('live');
        pushToast({ kind: 'tx', text: 'Call locked on-chain · ' + ciShortTx(tx) });
      }, 1300);
    },
    cashOut() {
      const r = roundRef.current;
      if (!r || phaseRef.current !== 'live') return;
      const value = ciCashoutValue(r, feedRef.current.price, worldRemaining());
      const pnl = value - r.stake;
      const claimTx = ciMakeTx();
      const { fresh } = applyOutcome(p => {
        p.calls += 1;
        p.cashouts += 1;
        p.balance += value;
        p.netPnl += pnl;
        p.dayProfit += pnl;
        // cash-out keeps the streak alive but doesn't grow it
        p.history = [{
          id: r.tx, side: r.side, stake: r.stake, odds: r.odds, lock: r.lock,
          settle: feedRef.current.price, result: 'cashout', pnl,
          duration: r.duration, ts: Date.now(), tx: claimTx,
        }].concat(p.history).slice(0, 60);
        return p;
      });
      setResult({
        type: 'cashout', side: r.side, stake: r.stake, odds: r.odds,
        payout: value, pnl, lock: r.lock, settle: feedRef.current.price,
        boost: 0, streakBefore: r.streakBefore, streakAfter: profileRef.current.streak,
        tx: claimTx, newBadges: fresh,
      });
      setRound(null);
      setPhase('result');
    },
    dismissResult() { setResult(null); setPhase('idle'); },
    pushToast,
  };

  // ── leaderboard bots drift ──
  useEffect(() => {
    const iv = setInterval(() => {
      setBots(bs => bs.map(b => ({
        ...b,
        profit: b.profit + ciGauss() * 6,
        streak: Math.random() < 0.12 ? Math.max(0, b.streak + (Math.random() < 0.5 ? 1 : -b.streak)) : b.streak,
      })));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return {
    profile, feed, odds, duration, phase, round, settleStep, result, toasts, bots,
    worldRemaining, actions, clockTick,
  };
}

// early-redeem value priced off the current surface
function ciCashoutValue(round, price, remaining) {
  const durSecs = CI_DURATIONS[round.duration].secs;
  const frac = ciClamp(remaining / durSecs, 0, 1);
  const edgeBps = ((price - round.lock) / round.lock) * 10000 * (round.side === 'up' ? 1 : -1);
  const p = ciClamp(0.5 + edgeBps / (26 * Math.sqrt(frac + 0.045)), 0.04, 0.965);
  return Math.max(0, Math.round(round.stake * round.odds * p * 0.985 * 100) / 100);
}

Object.assign(window, {
  useCallItGame, ciCashoutValue,
  CI_DURATIONS, CI_BADGES,
  ciFmtUSD, ciFmtPrice, ciFmtClock, ciShortTx, ciClamp,
});
