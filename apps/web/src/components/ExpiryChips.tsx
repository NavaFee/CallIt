'use client';

import type { OracleSnapshot } from '@/lib/server/market';
import { expiryCountdown, expiryStamp } from '@/lib/format';

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
  if (oracles.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white/5 px-3 py-2 text-center text-[12px] font-bold text-muted">
        No active markets right now — new expiries appear here automatically
      </div>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-testid="expiry-chips">
      {oracles.map((o) => {
        const active = o.oracleId === selected;
        const short = Number(o.expiryMs) - Date.now() < 2 * 3600_000;
        return (
          <button
            key={o.oracleId}
            type="button"
            onClick={() => onSelect(o.oracleId)}
            className="ci-pressable flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-center"
            style={{
              minWidth: 96,
              background: active ? 'linear-gradient(180deg, #2A3450, #1E2740)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
              boxShadow: active ? '0 0 14px rgba(255,197,61,0.18)' : undefined,
              color: active ? 'var(--gold)' : 'var(--muted)',
            }}
          >
            <div className="text-[9px] font-black tracking-[0.08em]">
              {o.tradeable ? 'EXPIRY' : 'PAUSED'}
            </div>
            <div className="num text-[13px] font-black">
              {short
                ? expiryCountdown(o.expiryMs)
                : new Date(o.expiryMs).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
            </div>
            <div className="num text-[10px] font-bold opacity-75">
              {short ? `in ${expiryCountdown(o.expiryMs)}` : expiryStamp(o.expiryMs)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
