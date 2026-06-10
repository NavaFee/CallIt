export function fmtUsd(n: number, dp = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function fmtDusdcUnits(units: string | bigint, dp = 2): string {
  return (Number(BigInt(units)) / 1e6).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function fixedToUsdNum(fixed: string | bigint): number {
  return Number(BigInt(fixed)) / 1e9;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** "1d 19h" / "6h 12m" / "14m" / "expired" */
export function expiryCountdown(expiryMs: number, now = Date.now()): string {
  const ms = expiryMs - now;
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

/** "Fri 08:00 UTC" — how weekly expiries are labeled on chips */
export function expiryStamp(expiryMs: number): string {
  const d = new Date(expiryMs);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${hh}:${mm} UTC`;
}
