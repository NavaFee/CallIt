/**
 * Bot tests via grammY's handleUpdate injection — no Telegram servers.
 * Outgoing API calls are intercepted with an api transformer; incoming
 * updates are hand-built JSON.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@callit/db';
import type { Update, UserFromGetMe } from 'grammy/types';
import { createBot, renderSettlementCard } from '../src/bot.js';

const BOT_INFO: UserFromGetMe = {
  id: 42,
  is_bot: true,
  first_name: 'CallIt',
  username: 'callit_notify_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: true,
  can_connect_to_business: false,
  has_main_web_app: false,
};

function makeUpdate(text: string): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 777, type: 'private', first_name: 'Fei' },
      from: { id: 777, is_bot: false, first_name: 'Fei' },
      text,
      entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0]!.length }],
    },
  };
}

function captureBot(db: Db | null) {
  const bot = createBot({ token: 'test-token', db, appUrl: 'https://callit.test', botInfo: BOT_INFO });
  const sent: Array<{ method: string; payload: Record<string, unknown> }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    sent.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, sent };
}

describe('notify bot', () => {
  it('explains binding when /start has no code', async () => {
    const { bot, sent } = captureBot(null);
    await bot.handleUpdate(makeUpdate('/start'));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.method).toBe('sendMessage');
    expect(String(sent[0]!.payload.text)).toContain('Connect Telegram');
  });

  it('binds a chat with a valid deep-link code', async () => {
    const fakeDb = {} as Db;
    const social = await import('@callit/db');
    const spy = vi.spyOn(social, 'bindTelegram').mockResolvedValue('0xabcdef1234567890');
    const { bot, sent } = captureBot(fakeDb);
    await bot.handleUpdate(makeUpdate('/start secret42'));
    expect(spy).toHaveBeenCalledWith(fakeDb, 'secret42', 777);
    expect(String(sent[0]!.payload.text)).toContain('✅ Linked to 0xabcd');
    spy.mockRestore();
  });

  it('rejects expired codes', async () => {
    const social = await import('@callit/db');
    const spy = vi.spyOn(social, 'bindTelegram').mockResolvedValue(null);
    const { bot, sent } = captureBot({} as Db);
    await bot.handleUpdate(makeUpdate('/start nope'));
    expect(String(sent[0]!.payload.text)).toContain('expired');
    spy.mockRestore();
  });
});

describe('settlement cards', () => {
  it('renders a win with streak flame', () => {
    const text = renderSettlementCard({
      won: true,
      payoutDusdc: 19.84,
      costDusdc: 10,
      isUp: true,
      strikeUsd: 61417,
      settleUsd: 61890,
      streak: 3,
    });
    expect(text).toContain('CALLED IT! +19.84 dUSDC');
    expect(text).toContain('UP call at $61,417');
    expect(text).toContain('×3');
  });

  it('renders a loss without streak', () => {
    const text = renderSettlementCard({
      won: false,
      payoutDusdc: 0,
      costDusdc: 10,
      isUp: false,
      strikeUsd: 61417,
      settleUsd: 61890,
      streak: 0,
    });
    expect(text).toContain('MISSED CALL −10.00 dUSDC');
    expect(text).toContain('Run it back?');
  });
});
