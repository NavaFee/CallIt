import { describe, expect, it } from 'vitest';
import {
  buildTelegramInitData,
  buildTelegramLoginWidgetPayload,
  verifyTelegramInitData,
  verifyTelegramLoginWidget,
} from '../src/telegram.js';

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

function freshWidgetPayload(overrides: Record<string, string | number> = {}) {
  return buildTelegramLoginWidgetPayload(TOKEN, {
    id: 6648943774,
    first_name: 'Fei',
    username: 'avezzz0',
    auth_date: Math.floor(NOW / 1000) - 60,
    ...overrides,
  });
}

describe('telegram Login Widget verification', () => {
  it('accepts a correctly signed payload and parses the user', () => {
    const result = verifyTelegramLoginWidget(freshWidgetPayload(), TOKEN, 86_400, NOW);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(6648943774);
    expect(result!.username).toBe('avezzz0');
  });

  it('uses the widget key derivation, not the Mini App one', () => {
    // a payload signed with the initData scheme (HMAC keyed 'WebAppData')
    // must NOT pass the widget verifier even with the same token
    const fields = {
      id: '42',
      auth_date: String(Math.floor(NOW / 1000)),
    };
    const initStyle = new URLSearchParams(buildTelegramInitData(TOKEN, fields));
    const crossed: Record<string, unknown> = Object.fromEntries(initStyle.entries());
    expect(verifyTelegramLoginWidget(crossed, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects a payload signed with a different bot token', () => {
    const forged = buildTelegramLoginWidgetPayload('999:WRONG-token', {
      id: 1,
      auth_date: Math.floor(NOW / 1000),
    });
    expect(verifyTelegramLoginWidget(forged, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects tampered fields (forged tg id with original hash)', () => {
    const payload = freshWidgetPayload();
    payload.id = 666;
    expect(verifyTelegramLoginWidget(payload, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects payloads older than 24h', () => {
    const stale = freshWidgetPayload({ auth_date: Math.floor(NOW / 1000) - 25 * 3600 });
    expect(verifyTelegramLoginWidget(stale, TOKEN, 86_400, NOW)).toBeNull();
  });

  it('rejects missing hash, bad hash hex, and missing id', () => {
    const { hash: _hash, ...noHash } = freshWidgetPayload();
    expect(verifyTelegramLoginWidget(noHash, TOKEN, 86_400, NOW)).toBeNull();
    expect(
      verifyTelegramLoginWidget({ ...freshWidgetPayload(), hash: 'not-hex!!' }, TOKEN, 86_400, NOW),
    ).toBeNull();
    const noId = buildTelegramLoginWidgetPayload(TOKEN, { auth_date: Math.floor(NOW / 1000) });
    expect(verifyTelegramLoginWidget(noId, TOKEN, 86_400, NOW)).toBeNull();
  });
});
