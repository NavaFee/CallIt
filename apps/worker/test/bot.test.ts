/**
 * Bot tests via grammY's handleUpdate injection — no Telegram servers.
 * Outgoing API calls are intercepted with an api transformer; incoming
 * updates are hand-built JSON.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@callit/db';
import type { Update, UserFromGetMe } from 'grammy/types';
import { createBot, renderSettlementCard, sendSettlementDM } from '../src/bot.js';

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
    expect(spy).toHaveBeenCalledWith(fakeDb, 'secret42', 777, undefined);
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

  it('binds a one-click login nonce on /start login_<nonce>', async () => {
    const social = await import('@callit/db');
    const spy = vi.spyOn(social, 'bindLoginNonce').mockResolvedValue('bound');
    const { bot, sent } = captureBot({} as Db);
    await bot.handleUpdate(makeUpdate('/start login_abc123'));
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'abc123', 777, undefined);
    expect(String(sent[0]!.payload.text)).toContain('Logging you in');
    spy.mockRestore();
  });

  it('reports an expired/used login nonce', async () => {
    const social = await import('@callit/db');
    const spy = vi.spyOn(social, 'bindLoginNonce').mockResolvedValue('invalid');
    const { bot, sent } = captureBot({} as Db);
    await bot.handleUpdate(makeUpdate('/start login_stale'));
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

describe('settlement DM delivery', () => {
  it('sends the PNG card via sendPhoto with the text card as caption', async () => {
    const social = await import('@callit/db');
    const chatSpy = vi.spyOn(social, 'chatIdFor').mockResolvedValue(777);
    const { bot, sent } = captureBot({} as Db);
    const ok = await sendSettlementDM(
      bot.api,
      {} as Db,
      '0xuser',
      { won: true, payoutDusdc: 19.84, costDusdc: 10, isUp: true, strikeUsd: 61417, settleUsd: 61890, streak: 3 },
      'https://callit.test',
    );
    expect(ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.method).toBe('sendPhoto');
    expect(String(sent[0]!.payload.caption)).toContain('CALLED IT! +19.84 dUSDC');
    expect(sent[0]!.payload.reply_markup).toBeTruthy();
    chatSpy.mockRestore();
  });

  it('skips silently for unbound users', async () => {
    const social = await import('@callit/db');
    const chatSpy = vi.spyOn(social, 'chatIdFor').mockResolvedValue(null);
    const { bot, sent } = captureBot({} as Db);
    const ok = await sendSettlementDM(
      bot.api,
      {} as Db,
      '0xuser',
      { won: false, payoutDusdc: 0, costDusdc: 5, isUp: false, strikeUsd: 61417, settleUsd: 61890, streak: 0 },
      'https://callit.test',
    );
    expect(ok).toBe(false);
    expect(sent).toHaveLength(0);
    chatSpy.mockRestore();
  });
});

describe('inline share', () => {
  function inlineUpdate(): Update {
    return {
      update_id: 2,
      inline_query: {
        id: 'q1',
        from: { id: 777, is_bot: false, first_name: 'Fei' },
        query: '',
        offset: '',
        chat_type: 'group',
      },
    };
  }

  it('serves the cached card photo when one exists', async () => {
    const social = await import('@callit/db');
    const cardSpy = vi
      .spyOn(social, 'lastCardByTgId')
      .mockResolvedValue({ fileId: 'AgACfile42', text: 'I just called BTC UP 🎯' });
    const { bot, sent } = captureBot({} as Db);
    await bot.handleUpdate(inlineUpdate());
    expect(sent[0]!.method).toBe('answerInlineQuery');
    const results = sent[0]!.payload.results as Array<Record<string, unknown>>;
    expect(results[0]!.type).toBe('photo');
    expect(results[0]!.photo_file_id).toBe('AgACfile42');
    cardSpy.mockRestore();
  });

  it('falls back to a text invite without a cached card', async () => {
    const { bot, sent } = captureBot(null);
    await bot.handleUpdate(inlineUpdate());
    expect(sent[0]!.method).toBe('answerInlineQuery');
    const results = sent[0]!.payload.results as Array<Record<string, unknown>>;
    expect(results[0]!.type).toBe('article');
  });

  it('swallows a stale-query answer failure instead of crashing the worker', async () => {
    const bot = createBot({ token: 'test-token', db: null, appUrl: 'https://callit.test', botInfo: BOT_INFO });
    // Telegram 400 'query is too old' — used to propagate out of polling,
    // stop the bot, and take the keeper/settlers down with it
    bot.api.config.use(async () => {
      throw new Error('Bad Request: query is too old');
    });
    await expect(bot.handleUpdate(inlineUpdate())).resolves.toBeUndefined();
  });
});
