'use client';

import { useEffect, useRef } from 'react';

/** Minimal canvas sparkline: gradient area + glowing line, retina-aware. */
export function Sparkline({
  points,
  width,
  height,
  up,
}: {
  points: number[];
  width: number;
  height: number;
  up: boolean;
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

    const min = Math.min(...points);
    const max = Math.max(...points);
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
  }, [points, width, height, up]);

  return <canvas ref={ref} style={{ width, height }} />;
}
