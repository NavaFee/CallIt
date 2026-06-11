'use client';

import { useState } from 'react';
import { WELCOME_DUSDC } from '@/lib/welcome';
import { ChunkyButton } from './ChunkyButton';

/**
 * First-visit gate: one tap creates the session wallet, sponsors the
 * on-chain PredictManager and drops the welcome dUSDC stack.
 * zkLogin (Google) lands in the same provider seam later.
 */
export function Onboarding({ onClaim }: { onClaim: () => Promise<void> }) {
  const [stage, setStage] = useState<'intro' | 'connecting'>('intro');

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
        <ChunkyButton
          hue="gold"
          className="mt-10 h-[62px] w-full max-w-[320px] text-[18px]"
          data-testid="claim-button"
          onClick={async () => {
            setStage('connecting');
            try {
              await onClaim();
            } finally {
              setStage('intro');
            }
          }}
        >
          START — CLAIM {WELCOME_DUSDC} dUSDC
        </ChunkyButton>
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
