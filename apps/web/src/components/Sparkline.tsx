'use client';

import { useEffect, useRef } from 'react';

/** Minimal canvas sparkline: gradient area + glowing line, retina-aware.
 *  With an open call, a gold dashed line marks the locked strike. */
export function Sparkline({
  points,
  width,
  height,
  up,
  lock = null,
}: {
  points: number[];
  width: number;
  height: number;
  up: boolean;
  lock?: { usd: number; isUp: boolean } | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // fold the lock level into the scale so the line never clips off-canvas
    const min = Math.min(...points, lock?.usd ?? Infinity);
    const max = Math.max(...points, lock?.usd ?? -Infinity);
    const span = max - min || 1;
    const stepX = width / (points.length - 1);
    const y = (v: number) => height - 6 - ((v - min) / span) * (height - 12);

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

    // locked strike: gold dashed line + LOCK pill at the right edge
    if (lock) {
      const ly = y(lock.usd);
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

      const label = `LOCK ${lock.isUp ? '▲' : '▼'}`;
      const pillW = 58;
      const pillH = 17;
      const px = width - pillW - 2;
      const py = Math.min(Math.max(ly - pillH / 2, 1), height - pillH - 1);
      ctx.save();
      ctx.fillStyle = '#FFC53D';
      ctx.beginPath();
      // manual rounded rect — roundRect isn't everywhere yet
      const r = pillH / 2;
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + pillW, py, px + pillW, py + pillH, r);
      ctx.arcTo(px + pillW, py + pillH, px, py + pillH, r);
      ctx.arcTo(px, py + pillH, px, py, r);
      ctx.arcTo(px, py, px + pillW, py, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3A2700';
      ctx.font = '900 9.5px var(--font-ui), system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px + pillW / 2, py + pillH / 2 + 0.5);
      ctx.restore();
    }

    // line
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
  }, [points, width, height, up, lock]);

  return <canvas ref={ref} style={{ width, height }} />;
}
