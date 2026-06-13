'use client';

import { useState } from 'react';
import { WELCOME_DUSDC } from '@/lib/welcome';
import { ChunkyButton } from './ChunkyButton';

/**
 * First-visit gate, two doors in:
 * - Continue with Telegram (Login Widget) — recoverable account from tap one;
 *   also how a returning player gets their wallet back on a fresh browser.
 * - Try as guest — the original one-tap session wallet + welcome stack.
 * The Mini App never sees this screen (initData logs in silently).
 */
export function Onboarding({
  onClaim,
  onTelegram,
}: {
  onClaim: () => Promise<void>;
  /** null/undefined ⇒ widget not configured on this deployment */
  onTelegram?: (() => Promise<void>) | null;
}) {
  const [stage, setStage] = useState<'intro' | 'connecting'>('intro');

  const run = async (action: () => Promise<void>) => {
    setStage('connecting');
    try {
      await action();
    } finally {
      setStage('intro');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'radial-gradient(circle at 50% 22%, #131A2C, var(--bg-page) 70%)' }}
      data-testid="onboarding"
    >
      <div
        className="flex h-[104px] w-[104px] items-center justify-center rounded-full font-display text-[44px]"
        style={{
          background: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
          boxShadow: 'inset 0 -4px 0 #B97E0A, inset 0 4px 0 #FFEDB3, 0 12px 40px rgba(255,197,61,0.3)',
          border: '3px solid #E9A718',
          color: '#5B3D00',
          animation: 'ci-coin-spin 3.2s ease-in-out infinite',
        }}
      >
        $
      </div>
      <h1 className="mt-6 font-display text-[46px] leading-none">
        Call<span className="text-gold">It</span>
      </h1>
      <p className="mt-2 text-[15px] font-bold text-muted">Call the market. Win the pot.</p>

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-[9px] font-black tracking-[0.1em] text-muted">
        <span className="rounded-full border border-line px-3 py-1">BTC CALLS</span>
        <span className="rounded-full border border-line px-3 py-1">ON-CHAIN · SUI</span>
        <span className="rounded-full border border-line px-3 py-1">AUTO PAYOUTS</span>
      </div>

      {stage === 'intro' ? (
        <div className="mt-10 flex w-full max-w-[320px] flex-col items-center gap-3">
          {onTelegram && (
            <ChunkyButton
              hue="sui"
              className="h-[62px] w-full flex-col gap-0 text-[17px]"
              data-testid="tg-login-button"
              onClick={() => run(onTelegram)}
            >
              ✈️ Continue with Telegram
              <span className="text-[11px] font-black opacity-75">
                your account on any device — claim {WELCOME_DUSDC} dUSDC
              </span>
            </ChunkyButton>
          )}
          {onTelegram ? (
            <button
              type="button"
              className="ci-pressable w-full rounded-2xl border border-line bg-white/[0.04] py-3 text-[13px] font-black text-muted"
              data-testid="claim-button"
              onClick={() => run(onClaim)}
            >
              Try as guest — claim {WELCOME_DUSDC} dUSDC
            </button>
          ) : (
            <ChunkyButton
              hue="gold"
              className="h-[62px] w-full text-[18px]"
              data-testid="claim-button"
              onClick={() => run(onClaim)}
            >
              START — CLAIM {WELCOME_DUSDC} dUSDC
            </ChunkyButton>
          )}
        </div>
      ) : (
        <div className="mt-10 flex h-[62px] flex-col items-center justify-center gap-2">
          <div
            className="h-[26px] w-[26px] rounded-full border-4 border-white/10"
            style={{ borderTopColor: 'var(--gold)', animation: 'ci-ring-spin 0.7s linear infinite' }}
          />
          <div className="text-[12px] font-extrabold text-muted">
            Waking up your wallet · creating your on-chain account…
          </div>
        </div>
      )}
      <p className="mt-4 text-[11px] font-bold text-muted opacity-80">
        Testnet — play money, real rails. No seed phrase, no gas popups.
      </p>
    </div>
  );
}
