'use client';

import { useEffect, useMemo, useRef } from 'react';

export interface ChartLock {
  usd: number;
  isUp: boolean;
}

/** Minimal canvas sparkline: gradient area + glowing line, retina-aware.
 *  Each open call adds a gold dashed line at its locked strike with a LOCK
 *  pill (side shown by a coloured ▲/▼); same-price locks are de-duplicated. */
export function Sparkline({
  points,
  width,
  height,
  up,
  locks = [],
}: {
  points: number[];
  width: number;
  height: number;
  up: boolean;
  locks?: ChartLock[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  // one line per distinct lock price ($1 strike grid → round to the dollar)
  const uniqLocks = useMemo(() => {
    const seen = new Set<number>();
    const out: ChartLock[] = [];
    for (const l of locks) {
      const key = Math.round(l.usd);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(l);
      }
    }
    return out;
  }, [locks]);

  // scale folds every lock in so no line is ever clipped; shared by the
  // canvas draw and the DOM pill overlay so they stay pixel-aligned
  const ready = points.length >= 2;
  const lockVals = uniqLocks.map((l) => l.usd);
  const min = ready ? Math.min(...points, ...lockVals) : 0;
  const max = ready ? Math.max(...points, ...lockVals) : 1;
  const span = max - min || 1;
  const y = (v: number) => height - 6 - ((v - min) / span) * (height - 12);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !ready) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const stepX = width / (points.length - 1);
    const color = up ? '#00E07B' : '#FF3D5E';
    const glow = up ? 'rgba(0,224,123,0.25)' : 'rgba(255,61,94,0.25)';

    // area fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, glow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, y(points[0]!));
    points.forEach((v, i) => ctx.lineTo(i * stepX, y(v)));
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // one gold dashed line per locked strike (pills are DOM, drawn below)
    for (const l of uniqLocks) {
      const ly = y(l.usd);
      ctx.save();
      ctx.strokeStyle = '#FFC53D';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(width, ly);
      ctx.stroke();
      ctx.restore();
    }

    // price line
    ctx.beginPath();
    ctx.moveTo(0, y(points[0]!));
    points.forEach((v, i) => ctx.lineTo(i * stepX, y(v)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // tip dot
    const lastX = (points.length - 1) * stepX;
    const lastY = y(points[points.length - 1]!);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [points, width, height, up, uniqLocks, min, max, span, ready]);

  // pill tops, nudged apart so near-equal locks don't overlap
  const PILL_H = 17;
  const pillTops = useMemo(() => {
    const placed = uniqLocks
      .map((l, i) => ({ i, top: y(l.usd) - PILL_H / 2 }))
      .sort((a, b) => a.top - b.top);
    for (let k = 1; k < placed.length; k++) {
      if (placed[k]!.top < placed[k - 1]!.top + PILL_H + 1) {
        placed[k]!.top = placed[k - 1]!.top + PILL_H + 1;
      }
    }
    const byIndex: Record<number, number> = {};
    for (const p of placed) byIndex[p.i] = Math.min(Math.max(p.top, 1), height - PILL_H - 1);
    return byIndex;
  }, [uniqLocks, min, max, span, height]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas ref={ref} style={{ width, height, display: 'block' }} />
      {ready &&
        uniqLocks.map((l, i) => (
          <div
            key={`${Math.round(l.usd)}-${l.isUp ? 'u' : 'd'}`}
            data-testid="chart-lock"
            data-side={l.isUp ? 'up' : 'down'}
            className="num pointer-events-none absolute flex items-center gap-0.5 rounded-full px-1.5 text-[9.5px] font-black"
            style={{
              right: 2,
              top: pillTops[i],
              height: PILL_H,
              background: 'var(--gold)',
              color: '#3A2700',
            }}
          >
            LOCK
            <span style={{ color: l.isUp ? '#0A6B3D' : '#7A0A1E' }}>{l.isUp ? '▲' : '▼'}</span>
          </div>
        ))}
    </div>
  );
}
