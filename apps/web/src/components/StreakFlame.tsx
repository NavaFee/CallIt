'use client';

/**
 * Streak flame: rotated-square flame with tier-colored cores, per the
 * design prototype. Tiers: 0 amber, 1 orange, 2 red, 3 purple-blue.
 */
const TIER_CORES: [string, string][] = [
  ['#FFC53D', '#FF8A1E'],
  ['#FF9A1E', '#FF4D1C'],
  ['#FF5A2B', '#E8143C'],
  ['#9D5CFF', '#4DA2FF'],
];

export function StreakFlame({
  streak,
  size = 18,
  showCount = true,
  animate = true,
}: {
  streak: number;
  size?: number;
  showCount?: boolean;
  animate?: boolean;
}) {
  const tier = streak >= 7 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
  const [core, outer] = TIER_CORES[tier]!;
  return (
    <span className="inline-flex items-center gap-1" data-testid="streak-flame">
      <span className="relative inline-block" style={{ width: size, height: size * 1.2 }}>
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            background: `radial-gradient(circle at 50% 80%, ${core}, ${outer})`,
            borderRadius: `50% 50% 50% 8%`,
            transform: 'rotate(45deg)',
            animation: animate ? 'ci-flame 0.9s ease-in-out infinite' : undefined,
            boxShadow: `0 0 ${size * 0.6}px ${outer}66`,
          }}
        />
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            background: '#FFEDB3',
            borderRadius: `50% 50% 50% 10%`,
            transform: 'rotate(45deg)',
          }}
        />
      </span>
      {showCount && <span className="num font-display text-[14px] text-gold">×{streak}</span>}
    </span>
  );
}
