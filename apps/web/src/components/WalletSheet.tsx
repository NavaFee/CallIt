'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { fmtDusdcUnits } from '@/lib/format';
import { useToast } from './Toast';

interface WalletInfo {
  address: string;
  managerId: string | null;
  coinType: string;
  mock: boolean;
  tgLinked?: boolean;
  tgUsername?: string | null;
  walletUnits: string;
  managerUnits: string;
  faucetFormUrl: string;
}

const HOLD_MS = 650;

function SkeletonBlock({ className }: { className: string }) {
  return <span aria-hidden="true" className={`inline-block animate-pulse rounded-md bg-white/[0.08] ${className}`} />;
}

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const toast = useToast();
  return (
    <div className="rounded-xl border border-line bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black tracking-[0.12em] text-muted">{label}</span>
        <button
          type="button"
          className="rounded-md border border-line px-2 py-0.5 text-[10px] font-black text-sui"
          onClick={() => {
            navigator.clipboard.writeText(value).then(
              () => toast.push('tx', `${label} copied`),
              () => toast.push('error', 'copy failed'),
            );
          }}
          data-testid={`copy-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          COPY
        </button>
      </div>
      <div className={`mt-1 break-all text-[11px] font-bold ${mono ? 'num font-mono' : ''}`}>{value}</div>
    </div>
  );
}

export function WalletSheet({
  open,
  onClose,
  onLinkTelegram,
}: {
  open: boolean;
  onClose: () => void;
  /** present ⇒ guests must link Telegram before the deposit flow opens */
  onLinkTelegram?: () => Promise<boolean>;
}) {
  const toast = useToast();
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setInfo(null);
    setQr(null);
    fetch('/api/wallet', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('wallet info failed to load');
        return (await r.json()) as WalletInfo;
      })
      .then(async (data) => {
        if (!alive) return;
        setInfo(data);
        const nextQr = await QRCode.toDataURL(data.address, {
          margin: 1,
          width: 168,
          color: { dark: '#F2F5FF', light: '#141927' },
        });
        if (alive) setQr(nextQr);
      })
      .catch(() => {
        if (alive) toast.push('error', 'wallet info failed to load');
      });
    return () => {
      alive = false;
    };
  }, [open, toast]);

  const loading = info === null;
  const totalUnits = info ? BigInt(info.walletUnits) + BigInt(info.managerUnits) : null;

  const submitWithdraw = async () => {
    if (!info || busy) return;
    setBusy(true);
    try {
      const units = BigInt(Math.round(Number(amount) * 1e6));
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), amountUnits: units.toString() }),
      });
      const data = (await res.json()) as { digest?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'withdraw failed');
      toast.push('money', `Sent ${amount} dUSDC · tx ${data.digest?.slice(0, 8)}…`);
      setAmount('');
      setTo('');
      const fresh = await fetch('/api/wallet', { cache: 'no-store' }).then((r) => r.json());
      setInfo(fresh);
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'withdraw failed');
    } finally {
      setBusy(false);
    }
  };

  const startHold = () => {
    if (busy || !to || !Number(amount)) return;
    fired.current = false;
    const start = performance.now();
    timer.current = setInterval(() => {
      const t = Math.min((performance.now() - start) / HOLD_MS, 1);
      setHold(t);
      if (t >= 1 && !fired.current) {
        fired.current = true;
        stopHold();
        void submitWithdraw();
      }
    }, 30);
  };
  const stopHold = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHold(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" data-testid="wallet-sheet">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 w-full"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[26px] border border-line bg-card px-5 pb-10 pt-3 sm:bottom-auto sm:top-1/2 sm:max-h-[80dvh] sm:-translate-y-1/2 sm:rounded-[26px]"
      >
        <div className="mx-auto h-[5px] w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="font-display text-[18px]">WALLET</h2>
          <span className="rounded-full border border-line px-2.5 py-1 text-[9px] font-black tracking-[0.1em] text-sui">
            SUI TESTNET
          </span>
        </div>

        {/* layered balances */}
        <div className="mt-4 text-center">
          <div
            className="num flex min-h-[48px] items-center justify-center font-display text-[40px] text-gold"
            style={{ textShadow: '0 0 24px rgba(255,197,61,0.3)' }}
          >
            {totalUnits === null ? (
              <SkeletonBlock className="h-10 w-36 rounded-xl" />
            ) : (
              fmtDusdcUnits(totalUnits.toString())
            )}
          </div>
          <div className="text-[10px] font-black tracking-[0.12em] text-muted">
            {loading ? 'SYNCING BALANCE' : 'TOTAL dUSDC'}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-center">
            <div className="text-[9px] font-black tracking-[0.1em] text-muted">
              {info?.mock ? 'PRACTICE BALANCE' : 'WALLET'}
            </div>
            <div className="num flex min-h-[22px] items-center justify-center font-display text-[17px]">
              {info === null ? <SkeletonBlock className="h-4 w-16" /> : fmtDusdcUnits(info.walletUnits)}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-center">
            <div className="text-[9px] font-black tracking-[0.1em] text-muted">IN TRADING ACCOUNT</div>
            <div className="num flex min-h-[22px] items-center justify-center font-display text-[17px]">
              {info === null ? <SkeletonBlock className="h-4 w-16" /> : fmtDusdcUnits(info.managerUnits)}
            </div>
          </div>
        </div>

        {/* address + QR */}
        {loading ? (
          <div className="mt-4 flex items-start gap-3">
            <SkeletonBlock className="h-[84px] w-[84px] rounded-lg" />
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-5 w-12 rounded-md" />
              </div>
              <SkeletonBlock className="mt-2 h-4 w-full" />
              <SkeletonBlock className="mt-1 h-4 w-2/3" />
            </div>
          </div>
        ) : info && (
          <div className="mt-4 flex items-start gap-3">
            {qr && (
              // QR of the session address — scan from any Sui wallet to deposit
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="address QR" width={84} height={84} className="rounded-lg border border-line" />
            )}
            <div className="min-w-0 flex-1">
              <CopyRow label="YOUR ADDRESS" value={info.address} />
            </div>
          </div>
        )}

        {/* telegram binding state (the desktop wallet modal carries it) */}
        {info && info.tgLinked && (
          <div
            className="mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2"
            style={{ borderColor: 'rgba(0,224,123,0.4)', background: 'rgba(0,224,123,0.06)' }}
            data-testid="wallet-tg-linked"
          >
            <span className="text-[14px]">✓</span>
            <div className="text-[11.5px] font-black text-up">
              Telegram linked
              {info.tgUsername ? <span className="num"> · @{info.tgUsername}</span> : null}
            </div>
          </div>
        )}
        {info && !info.tgLinked && onLinkTelegram && (
          <button
            type="button"
            className="ci-pressable mt-3 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left"
            style={{ borderColor: 'rgba(77,162,255,0.4)', background: 'rgba(77,162,255,0.06)' }}
            data-testid="wallet-tg-connect"
            onClick={async () => {
              if (await onLinkTelegram()) {
                setInfo((cur) => (cur ? { ...cur, tgLinked: true } : cur));
              }
            }}
          >
            <span className="text-[14px]">✈️</span>
            <div className="text-[11.5px] font-black text-sui">
              Connect Telegram
              <span className="block text-[10px] font-bold text-muted">
                daily refill · account on any device · settlement DMs
              </span>
            </div>
          </button>
        )}

        {/* deposit / withdraw tabs */}
        <div className="mt-4 flex gap-2">
          {(['deposit', 'withdraw'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={loading}
              onClick={() => setTab(t)}
              className="ci-pressable flex-1 rounded-xl py-2 text-[12px] font-black tracking-wide disabled:opacity-50"
              style={{
                background: tab === t ? 'linear-gradient(180deg, #2A3450, #1E2740)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${tab === t ? 'var(--gold)' : 'var(--line)'}`,
                color: tab === t ? 'var(--gold)' : 'var(--muted)',
              }}
              data-testid={`wallet-tab-${t}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {loading && (
          <div
            className="mt-3 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-center text-[11.5px] font-bold text-muted"
            data-testid="wallet-loading"
          >
            Loading wallet routes and balances...
          </div>
        )}

        {/* deposit safety gate: real coins need a recoverable account */}
        {tab === 'deposit' && info && info.tgLinked === false && onLinkTelegram && (
          <div
            className="mt-3 rounded-2xl border px-4 py-4 text-center"
            style={{ borderColor: 'rgba(77,162,255,0.5)', background: 'rgba(77,162,255,0.08)' }}
            data-testid="deposit-gate"
          >
            <div className="font-display text-[15px] text-sui">SECURE YOUR ACCOUNT FIRST</div>
            <p className="mt-1 text-[11.5px] font-bold text-muted">
              Real funds need a recoverable account — link Telegram first. Your address, balance and
              history stay exactly the same.
            </p>
            <button
              type="button"
              className="ci-pressable mt-3 w-full rounded-xl py-2.5 text-[12px] font-black text-[#04203D]"
              style={{ background: 'linear-gradient(180deg, #8FC6FF, var(--sui) 42%)', boxShadow: '0 3px 0 #1E5E9E' }}
              data-testid="deposit-gate-link"
              onClick={async () => {
                if (await onLinkTelegram()) {
                  setInfo((cur) => (cur ? { ...cur, tgLinked: true } : cur));
                }
              }}
            >
              ✈️ LINK TELEGRAM
            </button>
          </div>
        )}

        {tab === 'deposit' && info && !(info.tgLinked === false && onLinkTelegram) && (
          <div className="mt-3 flex flex-col gap-2.5">
            <p className="text-[11.5px] font-bold text-muted">
              Send dUSDC from any Sui wallet to your address above — it lands in seconds and is
              instantly playable.
            </p>
            <CopyRow label="dUSDC COIN TYPE" value={info.coinType} />
            <a
              href={info.faucetFormUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-[11.5px] font-bold text-sui"
            >
              Need dUSDC? Request it from the official DeepBook testnet faucet ↗
            </a>
            {info.mock && (
              <p className="text-[10.5px] font-bold text-muted opacity-80">
                This deployment runs a practice ledger — deposits to the address are real on-chain
                coins, but the play balance shown here is simulated.
              </p>
            )}
          </div>
        )}

        {tab === 'withdraw' &&
          info &&
          (info.mock ? (
            <p className="mt-3 rounded-xl border border-line bg-white/[0.03] px-3 py-3 text-[11.5px] font-bold text-muted">
              Practice funds live in a simulated ledger and can’t be withdrawn. On the real-custody
              deployment this tab sends dUSDC to any Sui address, gas-free.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient 0x…"
                spellCheck={false}
                className="num rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-[12px] font-bold text-ink placeholder:text-muted focus:border-gold focus:outline-none"
                data-testid="withdraw-to"
              />
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="amount"
                  inputMode="decimal"
                  className="num flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-[12px] font-bold text-ink placeholder:text-muted focus:border-gold focus:outline-none"
                  data-testid="withdraw-amount"
                />
                <button
                  type="button"
                  className="rounded-xl border border-line px-3 text-[11px] font-black text-gold"
                  onClick={() => setAmount((Number(totalUnits ?? 0n) / 1e6).toFixed(2))}
                >
                  MAX
                </button>
              </div>
              <button
                type="button"
                disabled={busy || !to || !Number(amount)}
                className="relative h-[52px] w-full overflow-hidden rounded-2xl border border-line text-[13px] font-black disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg, #232B42, #1A2133)' }}
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                data-testid="withdraw-hold"
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${hold * 100}%`,
                    background: 'linear-gradient(90deg, rgba(255,197,61,0.25), rgba(255,197,61,0.55))',
                  }}
                />
                <span className="relative">
                  {busy ? 'SENDING…' : hold > 0 ? 'HOLD…' : 'HOLD TO SEND'}
                </span>
              </button>
              <p className="text-[10px] font-bold text-muted opacity-80">
                Pulls from your wallet first, then your trading account. Gas is sponsored.
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
