import type { Metadata } from 'next';
import Link from 'next/link';
import { WELCOME_DUSDC } from '@/lib/welcome';
import { LiveTeaser } from '@/components/LiveTeaser';

export const metadata: Metadata = {
  title: 'CallIt — Call the market. Win the pot.',
  description:
    'BTC up-or-down calls settled on-chain via DeepBook Predict on Sui. Live volatility-surface odds, automatic payouts, zero wallet friction.',
};

const STEPS = [
  {
    n: '1',
    glow: 'var(--sui)',
    title: 'Sign in, get funded',
    body: 'One tap spins up a Sui wallet and your on-chain trading account behind the scenes. No seed phrase, no extension, nothing to lose.',
  },
  {
    n: '2',
    glow: 'var(--up)',
    title: 'Call UP or DOWN',
    body: 'Pick a side on BTC and stake your dUSDC. Odds are live-priced off DeepBook Predict’s volatility surface — and win streaks light the flame.',
  },
  {
    n: '3',
    glow: 'var(--gold)',
    title: 'Get paid automatically',
    body: 'The oracle snapshots the settlement price and a keeper claims your winnings straight to your balance. You do nothing but celebrate.',
  },
];

const PROOFS = [
  {
    label: 'Account created on-chain',
    detail: 'predict::create_manager',
    href: 'https://suiscan.xyz/testnet/tx/BGtfqMr69vS3wg2jMaS4cQ7DgMgnawRForTnEJkRCVtB',
  },
  {
    label: 'A real $10 call minted',
    detail: 'predict::mint — deposit + mint in one PTB',
    href: 'https://suiscan.xyz/testnet/tx/B2SyPtz14h41pBgKGbCZcQWxdDd1uNcMoUvwQ3DtN6sJ',
  },
  {
    label: 'Early cash-out at the live bid',
    detail: 'predict::redeem before expiry',
    href: 'https://suiscan.xyz/testnet/tx/7VZ7CtAcpJTNupwQgDRfFnuPkQNR4LZdsyCfgSkVdk2o',
  },
  {
    label: 'Keeper auto-claimed a settlement',
    detail: 'predict::redeem_permissionless — executor ≠ owner',
    href: 'https://suiscan.xyz/testnet/tx/35txXpaBp2kPKAQk7zP9s8h5DWGhKEmvFkLZEuCp1GMz',
  },
  {
    label: 'A live PredictManager object',
    detail: 'positions are balances inside the manager, not NFTs',
    href: 'https://suiscan.xyz/testnet/object/0xfa7390c9eb0329e7abac5e043afc08398c05c5de9c736e3554350c8929442012',
  },
];

const TRUST = [
  { mark: 'S', color: 'var(--sui)', bg: 'rgba(77,162,255,0.15)', text: 'Built on Sui' },
  { mark: 'D', color: 'var(--up)', bg: 'rgba(0,224,123,0.12)', text: 'Powered by DeepBook Predict' },
  { mark: 'zk', color: 'var(--gold)', bg: 'rgba(255,197,61,0.12)', text: 'No wallet needed' },
];

function Coin({ size = 32, children }: { size?: number; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        background: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
        boxShadow: 'inset 0 -2px 0 var(--gold-deep), inset 0 2px 0 #FFEDB3',
        border: '2px solid #E9A718',
        color: '#5B3D00',
      }}
    >
      {children}
    </span>
  );
}

export default function Welcome() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      {/* nav */}
      <nav
        className="sticky top-0 z-50 border-b border-line"
        style={{ background: 'rgba(7,9,15,0.8)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-5">
          <span className="flex items-center gap-2.5 font-display text-[26px]">
            <Coin>$</Coin>
            Call<span className="-ml-2 text-gold">It</span>
          </span>
          <Link
            href="/play"
            className="ci-pressable flex h-[44px] items-center rounded-[14px] px-5 font-ui text-[16px] font-black text-[#3A2700]"
            style={{
              background: 'linear-gradient(180deg, #FFE08A 0%, var(--gold) 42%)',
              boxShadow: '0 5px 0 var(--gold-deep)',
            }}
          >
            PLAY NOW
          </Link>
        </div>
      </nav>

      {/* hero */}
      <header className="overflow-hidden pt-[64px]">
        <div className="mx-auto max-w-[1120px] px-5">
          <div className="max-w-[640px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[10px] font-black tracking-[0.12em] text-muted">
              <span
                className="h-1.5 w-1.5 rounded-full bg-up"
                style={{ animation: 'ci-glow-pulse 1.4s ease-in-out infinite' }}
              />
              LIVE ON SUI TESTNET
            </span>
            <h1 className="mt-5 font-display text-[56px] leading-[0.98] sm:text-[74px]">
              Call the market.
              <br />
              Win{' '}
              <span className="text-gold" style={{ textShadow: '0 0 38px rgba(255,197,61,0.35)' }}>
                the pot
              </span>
              .
            </h1>
            <p className="mt-5 max-w-[480px] text-[19px] font-bold leading-[1.55] text-muted">
              BTC up-or-down calls, settled on-chain. Odds priced off a{' '}
              <span className="text-ink">live volatility surface</span>, payouts claimed for you{' '}
              <span className="text-ink">automatically</span>. No charts degree required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link
                href="/play"
                className="ci-pressable inline-flex h-[62px] items-center rounded-[18px] px-8 font-ui text-[20px] font-black text-[#3A2700]"
                style={{
                  background: 'linear-gradient(180deg, #FFE08A 0%, var(--gold) 42%)',
                  boxShadow: '0 6px 0 var(--gold-deep), 0 12px 26px rgba(255,197,61,0.4)',
                }}
              >
                PLAY NOW
              </Link>
              <a
                href="https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16/packages/predict"
                target="_blank"
                rel="noreferrer"
                className="ci-pressable inline-flex h-[62px] items-center rounded-[18px] border border-line px-8 font-ui text-[16px] font-black text-muted"
                style={{ background: 'linear-gradient(180deg, #222B42 0%, #1A2133 42%)', boxShadow: '0 6px 0 #0B0E18' }}
              >
                How it’s priced ↗
              </a>
            </div>
            <p className="mt-4 text-[12.5px] font-extrabold text-muted">
              Free {WELCOME_DUSDC} dUSDC practice stack · no seed phrase, no gas pop-ups
            </p>
          </div>

          {/* live teaser strip — real chain data */}
          <LiveTeaser />
        </div>
      </header>

      {/* how it works */}
      <section className="pt-24">
        <div className="mx-auto max-w-[1120px] px-5 text-center">
          <h2 className="font-display text-[34px] sm:text-[42px]">Three taps to your first call</h2>
          <p className="mt-2 text-[16px] font-bold text-muted">
            From zero to settled — no wallet setup, no gas, no waiting.
          </p>
          <div className="mt-11 grid gap-4 text-left sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative overflow-hidden rounded-3xl border border-line p-7"
                style={{ background: 'linear-gradient(180deg, #1A2133, #141927)' }}
              >
                <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: step.glow }} />
                <Coin size={34}>{step.n}</Coin>
                <h3 className="mt-4 font-display text-[23px]">{step.title}</h3>
                <p className="mt-2 text-[14.5px] font-bold leading-[1.6] text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="pt-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <div
            className="flex flex-wrap items-center justify-center rounded-full border border-line px-3 py-4"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {TRUST.map((item, i) => (
              <span
                key={item.text}
                className="flex items-center gap-2.5 whitespace-nowrap px-8 text-[15px] font-black"
                style={i > 0 ? { borderLeft: '1px solid var(--line)' } : undefined}
              >
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: item.bg, color: item.color, border: `1px solid ${item.color}66` }}
                >
                  {item.mark}
                </span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* verify on-chain */}
      <section className="pt-20">
        <div className="mx-auto max-w-[1120px] px-5 text-center">
          <h2 className="font-display text-[30px] sm:text-[38px]">
            Don&apos;t trust it — <span className="text-gold">click it</span>.
          </h2>
          <p className="mt-2 text-[15px] font-bold text-muted">
            Every flow in CallIt is a real DeepBook Predict transaction on Sui testnet. Here are five.
          </p>
          <div className="mx-auto mt-8 flex max-w-[760px] flex-col gap-2.5 text-left">
            {PROOFS.map((proof) => (
              <a
                key={proof.href}
                href={proof.href}
                target="_blank"
                rel="noreferrer"
                className="ci-pressable flex items-center gap-3 rounded-2xl border border-line px-5 py-3.5"
                style={{ background: 'linear-gradient(180deg, #1A2133, #141927)' }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black"
                  style={{ background: 'rgba(0,224,123,0.12)', color: 'var(--up)', border: '1px solid rgba(0,224,123,0.4)' }}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-black">{proof.label}</span>
                  <span className="num block truncate text-[11px] font-bold text-muted">{proof.detail}</span>
                </span>
                <span className="text-[12px] font-black text-sui">Suiscan ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* big CTA */}
      <section className="relative overflow-hidden pb-[120px] pt-[110px] text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(560px circle at 50% 60%, rgba(255,197,61,0.1), transparent 70%)' }}
        />
        <h2 className="relative font-display text-[40px] sm:text-[56px]">
          The next round starts <span className="text-gold">now</span>.
        </h2>
        <p className="relative mt-4 text-[17px] font-bold text-muted">
          Claim your free {WELCOME_DUSDC} dUSDC practice stack and make your first call in under a minute.
        </p>
        <Link
          href="/play"
          className="ci-pressable relative mt-9 inline-flex h-[72px] items-center rounded-[20px] px-12 font-ui text-[25px] font-black text-[#3A2700]"
          style={{
            background: 'linear-gradient(180deg, #FFE08A 0%, var(--gold) 42%)',
            boxShadow: '0 7px 0 var(--gold-deep), 0 14px 30px rgba(255,197,61,0.4)',
          }}
        >
          PLAY NOW — IT’S FREE
        </Link>
      </section>

      {/* footer */}
      <footer className="border-t border-line py-9">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5">
          <span className="flex items-center gap-2 font-display text-[18px]">
            <Coin size={24}>$</Coin>
            Call<span className="-ml-1.5 text-gold">It</span>
          </span>
          <span className="text-[12px] font-bold text-muted opacity-70">
            callit.markets · Sui testnet · play money, real rails · © 2026 CallIt
          </span>
        </div>
      </footer>
    </div>
  );
}
