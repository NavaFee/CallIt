import type { Config } from 'tailwindcss';

/**
 * CallIt design tokens, ported verbatim from the design prototype
 * (design/CallIt.html + design/js/ui.jsx). Gold is reserved for money and
 * streaks; up/down greens/reds carry direction; everything sits on the dark
 * navy arcade shell.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#07090F',
        shell: '#0B0E16',
        card: '#141927',
        'card-2': '#1A2133',
        line: 'rgba(255,255,255,0.07)',
        ink: '#F2F5FF',
        muted: '#8B93AC',
        gold: '#FFC53D',
        'gold-deep': '#B97E0A',
        sui: '#4DA2FF',
        up: '#00E07B',
        'up-hi': '#5FFFB0',
        'up-edge': '#067A45',
        down: '#FF3D5E',
        'down-hi': '#FF8DA1',
        'down-edge': '#9E1430',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'edge-up': '0 8px 0 #067A45, 0 14px 26px rgba(0,224,123,0.35)',
        'edge-down': '0 8px 0 #9E1430, 0 14px 26px rgba(255,61,94,0.35)',
        'edge-gold': '0 6px 0 #B97E0A, 0 12px 26px rgba(255,197,61,0.4)',
        'edge-sui': '0 6px 0 #1B5FA8, 0 12px 26px rgba(77,162,255,0.4)',
        'edge-dim': '0 6px 0 #0B0E18',
      },
    },
  },
  plugins: [],
};

export default config;
