import type { Metadata, Viewport } from 'next';
import { Lilita_One, Nunito } from 'next/font/google';
import './globals.css';

const display = Lilita_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

const ui = Nunito({
  weight: ['600', '700', '800', '900', '1000'],
  subsets: ['latin'],
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'CallIt — Call the market. Win the pot.',
  description:
    'BTC up-or-down calls settled on-chain via DeepBook Predict on Sui. Live volatility-surface odds, automatic payouts, zero wallet friction.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#07090F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="font-ui min-h-screen bg-page text-ink antialiased">{children}</body>
    </html>
  );
}
