'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

type Hue = 'up' | 'down' | 'gold' | 'sui' | 'dim';

/**
 * The chunky 3D press-down button from the design system: vertical gradient
 * (highlight stops at 42%), hard bottom-edge shadow + soft glow, squash on
 * press (translateY(edge−1) scale(0.985)).
 */
const PALETTES: Record<Hue, { top: string; base: string; edge: string; glow: string; text: string }> = {
  up: { top: 'var(--up-hi)', base: 'var(--up)', edge: 'var(--up-edge)', glow: 'var(--up-glow)', text: '#06291A' },
  down: { top: 'var(--down-hi)', base: 'var(--down)', edge: 'var(--down-edge)', glow: 'var(--down-glow)', text: '#2B0410' },
  gold: { top: '#FFE08A', base: 'var(--gold)', edge: 'var(--gold-deep)', glow: 'rgba(255,197,61,0.4)', text: '#3A2700' },
  sui: { top: '#8FC6FF', base: 'var(--sui)', edge: '#1B5FA8', glow: 'rgba(77,162,255,0.4)', text: '#04203D' },
  dim: { top: '#222B42', base: '#1A2133', edge: '#0B0E18', glow: 'rgba(0,0,0,0)', text: 'var(--text)' },
};

export function ChunkyButton({
  hue = 'gold',
  edgeH = 6,
  disabled = false,
  onClick,
  className = '',
  style,
  children,
  ...rest
}: {
  hue?: Hue;
  edgeH?: number;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  const [pressed, setPressed] = useState(false);
  const p = PALETTES[hue];
  const resting: CSSProperties = {
    background: `linear-gradient(180deg, ${p.top} 0%, ${p.base} 42%)`,
    color: p.text,
    boxShadow: pressed
      ? `0 1px 0 ${p.edge}`
      : `0 ${edgeH}px 0 ${p.edge}, 0 ${edgeH + 6}px 26px ${p.glow}`,
    transform: pressed ? `translateY(${edgeH - 1}px) scale(0.985)` : undefined,
    opacity: disabled ? 0.45 : 1,
    filter: disabled ? 'saturate(0.4)' : undefined,
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={`ci-pressable relative flex items-center justify-center overflow-hidden rounded-[18px] font-ui font-black ${className}`}
      style={{ ...resting, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
