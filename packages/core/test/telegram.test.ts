import { describe, expect, it } from 'vitest';
import { buildTelegramInitData, verifyTelegramInitData } from '../src/telegram.js';

const TOKEN = '12345:TEST-token-for-hmac';
const NOW = 1_786_000_000_000;

function freshInitData(overrides: Record<string, string> = {}): string {
  return buildTelegramInitData(TOKEN, {
    auth_date: String(Math.floor(NOW / 1000) - 60),
    query_id: 'AAH-test',
    user: JSON.stringify({ id: 6648943774, first_name: 'Fei', username: 'avezzz0' }),
    ...overrides,
  });
}

describe('telegram initData verification', () => {
  it('accepts a correctly signed payload and parses the user', () => {
    const result = verifyTelegramInitData(freshInitData(), TOKEN, 86_400, NOW);
    expect(result).not.toBeNull();
    expect(result!.user!.id).toBe(6648943774);
    expect(result!.user!.username).toBe('avezzz0');
  });

  it('extracts the startapp referrer param', () => {
    const result = verifyTelegramInitData(
      freshInitData({ start_param: '0xreferrer123' }),
      TOKEN,
      86_400,
      NOW,
    );
    expect(result!.startParam).toBe('0xreferrer123');
  });

  it('rejects a payload signed with a different bot token', () => {
    const forged = buildTelegramInitData('999:WRONG-token', {
      auth_date: String(Math.floor(NOW / 1000)),
      user: JSON.stringify({ id: 1 }),
    });
    expect(verifyTelegramInitData(forged, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects tampered fields (forged tg id with original hash)', () => {
    const valid = freshInitData();
    const params = new URLSearchParams(valid);
    params.set('user', JSON.stringify({ id: 666, first_name: 'Mallory' }));
    expect(verifyTelegramInitData(params.toString(), TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects payloads older than 24h', () => {
    const stale = buildTelegramInitData(TOKEN, {
      auth_date: String(Math.floor(NOW / 1000) - 25 * 3600),
      user: JSON.stringify({ id: 1 }),
    });
    expect(verifyTelegramInitData(stale, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects payloads without a hash or user', () => {
    expect(verifyTelegramInitData('auth_date=123&user=%7B%7D', TOKEN, 86_400, NOW)).toBeNull();
    const noUser = buildTelegramInitData(TOKEN, {
      auth_date: String(Math.floor(NOW / 1000)),
    });
    expect(verifyTelegramInitData(noUser, TOKEN, 86_400, NOW)).toBeNull();
  });
});
