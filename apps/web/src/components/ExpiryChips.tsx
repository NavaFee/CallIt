'use client';

import { useMemo, useState } from 'react';
import type { OracleSnapshot } from '@/lib/server/market';
import { expiryCountdown, expiryStamp } from '@/lib/format';

const COLLAPSED_LIMIT = 3;

/**
 * Expiry selector driven entirely by the live active-oracle list — weekly
 * today ("Fri 08:00 UTC"), sub-hour chips automatically if the protocol
 * re-enables rolling expiries. Never hardcoded.
 */
export function ExpiryChips({
  oracles,
  selected,
  onSelect,
}: {
  oracles: OracleSnapshot[];
  selected: string | null;
  onSelect: (oracleId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () =>
      [...oracles].sort((a, b) => {
        if (a.tradeable !== b.tradeable) return a.tradeable ? -1 : 1;
        return Number(a.expiryMs) - Number(b.expiryMs);
      }),
    [oracles],
  );
  const visible = useMemo(() => {
    if (expanded || sorted.length <= COLLAPSED_LIMIT) return sorted;
    const selectedOracle = sorted.find((o) => o.oracleId === selected);
    const base = sorted.slice(0, COLLAPSED_LIMIT);
    if (!selectedOracle || base.some((o) => o.oracleId === selectedOracle.oracleId)) return base;
    return [...base.slice(0, COLLAPSED_LIMIT - 1), selectedOracle].sort(
      (a, b) => Number(a.expiryMs) - Number(b.expiryMs),
    );
  }, [expanded, selected, sorted]);
  const hiddenCount = sorted.length - visible.length;

  if (oracles.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white/5 px-3 py-2 text-center text-[12px] font-bold text-muted">
        No active markets right now — new expiries appear here automatically
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2" data-testid="expiry-chips">
      {visible.map((o) => {
        const active = o.oracleId === selected;
        const short = Number(o.expiryMs) - Date.now() < 2 * 3600_000;
        return (
          <button
            key={o.oracleId}
            type="button"
            onClick={() => onSelect(o.oracleId)}
            className="ci-pressable min-w-0 whitespace-nowrap rounded-xl px-2.5 py-[8px] text-center"
            style={{
              background: active ? 'linear-gradient(180deg, #2A3450, #1E2740)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
              boxShadow: active ? '0 0 14px rgba(255,197,61,0.18)' : undefined,
              color: active ? 'var(--gold)' : 'var(--muted)',
            }}
          >
            <div className="num text-[14px] font-black">
              {short
                ? expiryCountdown(o.expiryMs)
                : new Date(o.expiryMs).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
            </div>
            <div
              className="text-[9px] font-black tracking-[0.08em]"
              style={{ color: active ? 'rgba(255,197,61,0.72)' : 'rgba(139,147,172,0.62)' }}
            >
              {o.tradeable ? 'EXPIRY' : 'PAUSED'}
            </div>
            <div className="num text-[10px] font-bold opacity-75">
              {short ? 'LEFT' : expiryStamp(o.expiryMs)}
            </div>
          </button>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          className="ci-pressable rounded-xl border border-line bg-white/[0.035] px-2.5 py-[8px] text-center text-muted"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          data-testid="expiry-more"
        >
          <div className="num text-[14px] font-black">+{hiddenCount}</div>
          <div className="text-[9px] font-black tracking-[0.08em] opacity-70">MORE</div>
          <div className="text-[10px] font-bold opacity-60">MARKETS</div>
        </button>
      )}
      {expanded && sorted.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          className="ci-pressable rounded-xl border border-line bg-white/[0.025] px-2.5 py-[8px] text-center text-muted"
          onClick={() => setExpanded(false)}
          aria-expanded={expanded}
          data-testid="expiry-less"
        >
          <div className="text-[14px] font-black">VIEW</div>
          <div className="text-[9px] font-black tracking-[0.08em] opacity-70">LESS</div>
          <div className="text-[10px] font-bold opacity-60">FOCUS</div>
        </button>
      )}
    </div>
  );
}
