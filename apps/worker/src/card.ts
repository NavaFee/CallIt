/**
 * Server-rendered settlement card PNG — the DM/share twin of the web app's
 * ResultOverlay celebration. satori (flexbox → SVG) + resvg (SVG → PNG);
 * fonts are the app's own pair (Lilita One display, Nunito UI) read from
 * the @fontsource packages, so chat cards match the product pixel-for-pixel.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { SettlementCard } from './bot.js';

const W = 1200;
const H = 675;

// design tokens — apps/web/src/app/globals.css
const GOLD = '#FFC53D';
const UP = '#00E07B';
const DOWN = '#FF3D5E';
const CARD = '#141927';
const MUTED = '#8B93AC';
const TEXT = '#F2F5FF';
const LINE = 'rgba(255,255,255,0.1)';

const require = createRequire(import.meta.url);
let fontCache: Array<{ name: string; data: Buffer; weight: 400 | 800 | 900; style: 'normal' }> | null =
  null;

function fonts() {
  if (!fontCache) {
    fontCache = [
      {
        name: 'Lilita One',
        data: readFileSync(require.resolve('@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff')),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Nunito',
        data: readFileSync(require.resolve('@fontsource/nunito/files/nunito-latin-800-normal.woff')),
        weight: 800,
        style: 'normal',
      },
      {
        name: 'Nunito',
        data: readFileSync(require.resolve('@fontsource/nunito/files/nunito-latin-900-normal.woff')),
        weight: 900,
        style: 'normal',
      },
    ];
  }
  return fontCache;
}

type Node = { type: string; props: Record<string, unknown> };

/** satori object-notation helper (worker tsconfig has no jsx). */
function el(type: string, style: Record<string, unknown>, children?: Node[] | string): Node {
  return { type, props: { style: { display: Array.isArray(children) ? 'flex' : 'block', ...style }, children } };
}

const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function triangle(up: boolean, size: number, color: string): Node {
  const w = size * 1.24;
  const d = up ? `M ${w / 2} 0 L ${w} ${size} L 0 ${size} Z` : `M 0 0 L ${w} 0 L ${w / 2} ${size} Z`;
  return {
    type: 'svg',
    props: {
      width: w,
      height: size,
      viewBox: `0 0 ${w} ${size}`,
      children: { type: 'path', props: { d, fill: color } },
    },
  };
}

/** The web StreakFlame, rebuilt as rotated gradient squares. */
function flame(streak: number, size: number): Node {
  const tier = streak >= 7 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
  const cores = [
    ['#FFC53D', '#FF8A1E'],
    ['#FF9A1E', '#FF4D1C'],
    ['#FF5A2B', '#E8143C'],
    ['#9D5CFF', '#4DA2FF'],
  ][tier]!;
  return el(
    'div',
    { width: size, height: size * 1.15, alignItems: 'flex-end', justifyContent: 'center', position: 'relative' },
    [
      el('div', {
        position: 'absolute',
        bottom: size * 0.05,
        width: size * 0.82,
        height: size * 0.82,
        backgroundImage: `linear-gradient(135deg, ${cores[0]}, ${cores[1]})`,
        borderRadius: '8% 50% 50% 50%',
        transform: 'rotate(45deg)',
      }),
      el('div', {
        position: 'absolute',
        bottom: size * 0.16,
        left: size * 0.27,
        width: size * 0.46,
        height: size * 0.46,
        backgroundImage: 'linear-gradient(135deg, #FFF6D9, #FFD66B)',
        borderRadius: '8% 50% 50% 50%',
        transform: 'rotate(45deg)',
      }),
    ],
  );
}

function priceBox(label: string, value: string): Node {
  return el('div', { flexDirection: 'column', alignItems: 'center', gap: 2 }, [
    el('div', { fontSize: 18, fontWeight: 900, letterSpacing: 3, color: MUTED }, label),
    el('div', { fontFamily: 'Lilita One', fontSize: 44, color: TEXT }, value),
  ]);
}

export function buildCardTree(card: SettlementCard): Node {
  const accent = card.won ? UP : DOWN;
  const title = card.won ? 'CALLED IT!' : 'SETTLED';
  const amount = card.won
    ? `+${card.payoutDusdc.toFixed(2)} dUSDC`
    : `−${card.costDusdc.toFixed(2)} dUSDC`;
  const multiplier = card.costDusdc > 0 ? (card.won ? card.payoutDusdc : 0) / card.costDusdc : 0;

  const badges: Node[] = [];
  if (card.streak >= 2) {
    badges.push(
      el(
        'div',
        {
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'rgba(255,197,61,0.12)',
          border: `2px solid rgba(255,197,61,0.45)`,
          borderRadius: 999,
          padding: '8px 22px',
        },
        [
          flame(card.streak, 30),
          el('div', { fontSize: 24, fontWeight: 900, color: GOLD }, `WIN STREAK ×${card.streak}`),
        ],
      ),
    );
  }
  if (card.won && multiplier > 0) {
    badges.push(
      el(
        'div',
        {
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: `2px solid ${LINE}`,
          borderRadius: 999,
          padding: '8px 22px',
        },
        [el('div', { fontSize: 24, fontWeight: 900, color: TEXT }, `×${multiplier.toFixed(2)} PAYOUT`)],
      ),
    );
  }

  const footerBits = [card.won ? 'Payout auto-claimed · Sui testnet' : 'the market had other plans'];
  if (card.txDigest) footerBits.push(`tx ${card.txDigest.slice(0, 8)}… · suiscan.xyz`);

  return el(
    'div',
    {
      width: W,
      height: H,
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#07090F',
      backgroundImage: card.won
        ? 'radial-gradient(circle at 50% 28%, rgba(0,224,123,0.16) 0%, rgba(7,9,15,0) 58%)'
        : 'radial-gradient(circle at 50% 28%, rgba(255,61,94,0.09) 0%, rgba(7,9,15,0) 58%)',
      padding: '28px 48px',
      fontFamily: 'Nunito',
    },
    [
      // brand bar
      el('div', { width: '100%', alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { alignItems: 'center', gap: 12 }, [
          el(
            'div',
            {
              width: 44,
              height: 44,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: 'radial-gradient(circle at 32% 28%, #FFE08A, #FFC53D 55%, #D89B12)',
              border: '3px solid #E9A718',
              fontFamily: 'Lilita One',
              fontSize: 22,
              color: '#5B3D00',
            },
            '$',
          ),
          el('div', { fontFamily: 'Lilita One', fontSize: 34, color: TEXT, alignItems: 'baseline' }, [
            el('div', {}, 'Call'),
            el('div', { color: GOLD }, 'It'),
          ]),
        ]),
        el(
          'div',
          {
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: 2,
            color: '#4DA2FF',
            border: '2px solid rgba(77,162,255,0.4)',
            borderRadius: 999,
            padding: '6px 18px',
            backgroundColor: 'rgba(77,162,255,0.1)',
          },
          'SUI TESTNET',
        ),
      ]),

      // title + amount
      el('div', { flexDirection: 'column', alignItems: 'center', marginTop: 26 }, [
        el(
          'div',
          {
            fontFamily: 'Lilita One',
            fontSize: card.won ? 96 : 80,
            color: card.won ? TEXT : MUTED,
            ...(card.won ? { textShadow: `0 0 48px ${accent}` } : {}),
          },
          title,
        ),
        el(
          'div',
          {
            fontFamily: 'Lilita One',
            fontSize: 64,
            color: card.won ? GOLD : DOWN,
            ...(card.won ? { textShadow: '0 0 36px rgba(255,197,61,0.45)' } : {}),
            marginTop: 2,
          },
          amount,
        ),
      ]),

      // streak + multiplier badges
      badges.length > 0
        ? el('div', { alignItems: 'center', gap: 16, marginTop: 18 }, badges)
        : el('div', { height: 8 }),

      // locked → settled
      el(
        'div',
        {
          alignItems: 'center',
          gap: 44,
          backgroundColor: CARD,
          border: `2px solid ${LINE}`,
          borderRadius: 26,
          padding: '18px 56px',
          marginTop: 22,
        },
        [
          priceBox('LOCKED', usd(card.strikeUsd)),
          el('div', { flexDirection: 'column', alignItems: 'center', gap: 6 }, [
            triangle(card.isUp, 26, accent),
            el('div', { fontSize: 15, fontWeight: 900, letterSpacing: 2, color: accent }, card.isUp ? 'UP' : 'DOWN'),
          ]),
          priceBox('SETTLED', usd(card.settleUsd)),
        ],
      ),

      el('div', { flexGrow: 1 }),

      // footer
      el('div', { flexDirection: 'column', alignItems: 'center', gap: 6 }, [
        el('div', { fontSize: 20, fontWeight: 800, color: MUTED }, footerBits.join(' · ')),
        card.balanceDusdc != null
          ? el('div', { fontSize: 24, fontWeight: 900, color: TEXT, alignItems: 'baseline', gap: 8 }, [
              el('div', {}, 'Balance:'),
              el('div', { color: GOLD }, `${card.balanceDusdc.toFixed(2)} dUSDC`),
            ])
          : el('div', { height: 2 }),
      ]),
    ],
  );
}

export async function renderSettlementCardPng(card: SettlementCard): Promise<Buffer> {
  const svg = await satori(buildCardTree(card) as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: fonts(),
  });
  return Buffer.from(new Resvg(svg).render().asPng());
}
