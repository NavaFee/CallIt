'use client';

import { useEffect, useRef } from 'react';

/**
 * Canvas confetti + coin shower, ported from the design prototype's
 * ConfettiBurst: launch from mid-upper screen, gravity 0.32/frame, air
 * friction 0.992, every 4th particle is a squish-wobbling gold coin,
 * fade-out over the last 600ms.
 */
export function Confetti({ count, durationMs = 3000 }: { count: number; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || count === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#FFC53D', '#FFFFFF', '#00E07B', '#4DA2FF', '#FF8A1E'];
    const parts = Array.from({ length: count }, (_, i) => {
      const speed = 7 + Math.random() * 13;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      return {
        x: w / 2 + (Math.random() - 0.5) * 60,
        y: h * 0.38,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        size: 5 + Math.random() * 7,
        coin: i % 4 === 0,
        coinSize: 9 + Math.random() * 6,
        wob: Math.random() * Math.PI * 2,
        color: colors[i % colors.length]!,
      };
    });

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = t > durationMs - 600 ? Math.max(0, (durationMs - t) / 600) : 1;
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.wob += 0.18;
        if (p.coin) {
          const squish = Math.abs(Math.cos(p.wob));
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          ctx.ellipse(0, 2, p.coinSize * squish, p.coinSize, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#B97E0A';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(0, 0, p.coinSize * squish, p.coinSize, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#FFC53D';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(-p.coinSize * squish * 0.3, -p.coinSize * 0.3, p.coinSize * squish * 0.35, p.coinSize * 0.35, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#FFE08A';
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (t < durationMs) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, durationMs]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
