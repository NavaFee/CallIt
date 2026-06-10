'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtUsd } from '@/lib/format';

/** Big tabular-numeral price with the up/down tick color animation. */
export function LivePrice({ usd }: { usd: number | null }) {
  const prev = useRef<number | null>(null);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    if (usd == null) return;
    if (prev.current != null && usd !== prev.current) {
      setDir(usd > prev.current ? 'up' : 'down');
      setSeq((s) => s + 1);
    }
    prev.current = usd;
  }, [usd]);

  if (usd == null) {
    return <div className="num font-display text-[38px] leading-none text-muted">—</div>;
  }
  const [int, dec] = fmtUsd(usd).split('.');
  return (
    <div
      key={seq}
      className="num font-display leading-none"
      style={{ animation: dir ? `ci-tick-${dir} 0.5s ease-out` : undefined }}
      data-testid="live-price"
    >
      <span className="text-[38px]">${int}</span>
      <span className="text-[20px] text-muted">.{dec}</span>
    </div>
  );
}
