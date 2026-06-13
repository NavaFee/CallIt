import { Bot, InlineKeyboard, InputFile, type Api, type RawApi } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import {
  bindLoginNonce,
  bindTelegram,
  chatIdFor,
  getDb,
  lastCardByTgId,
  setLastCard,
  type Db,
} from '@callit/db';

/**
 * CallIt notify bot — notifications only, never custody or trading.
 * - /start <code> binds a Telegram chat to a CallIt account (deep link
 *   minted by the web profile screen)
 * - settlement DMs: server-rendered PNG result card + share button after
 *   the keeper claims (text-only fallback if rendering fails)
 * - inline "Share": re-serves the last settlement card into any chat
 */

export interface BotDeps {
  token: string;
  db: Db | null;
  appUrl: string;
  /** override so tests skip the getMe network call */
  botInfo?: UserFromGetMe;
}

export function createBot({ token, db, appUrl, botInfo }: BotDeps) {
  const bot = new Bot(token, botInfo ? { botInfo } : undefined);

  bot.command('start', async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      await ctx.reply(
        'Welcome to CallIt — call the market, win the pot.\n\n' +
          `To link your account, open your profile at ${appUrl} and tap “Connect Telegram”.\n` +
          'Once linked, settlement results land here the moment the keeper pays out.',
      );
      return;
    }
    if (!db) {
      await ctx.reply('Binding is unavailable right now (no database configured).');
      return;
    }

    // bot one-click login: the start payload is a web-minted nonce. ctx.from
    // is message-derived and trusted (no hash needed) — bind it so the web
    // poll can complete the login.
    if (code.startsWith('login_')) {
      const nonce = code.slice('login_'.length);
      const bound = await bindLoginNonce(db, nonce, ctx.chat.id, ctx.from?.username);
      await ctx.reply(
        bound === 'bound'
          ? '✅ Logging you in — head back to CallIt, your account is loading.'
          : 'That login link expired — tap “Continue with Telegram” again on CallIt.',
      );
      return;
    }

    const userId = await bindTelegram(db, code, ctx.chat.id, ctx.from?.username);
    if (!userId) {
      await ctx.reply('That link expired — grab a fresh one from your CallIt profile.');
      return;
    }
    await ctx.reply(
      `✅ Linked to ${userId.slice(0, 6)}…${userId.slice(-4)}.\n` +
        'You’ll get a DM whenever one of your calls settles. Good luck out there 🎯',
    );
  });

  bot.command('help', (ctx) =>
    ctx.reply(
      `CallIt sends your settlement results here.\nPlay at ${appUrl} — this bot never asks for keys or funds.`,
    ),
  );

  // inline "Share": the last settlement card PNG, straight into any chat.
  // answerInlineQuery routinely 400s ('query is too old') once Telegram's
  // ~10s answer window lapses — swallow it so a stale inline panel can't
  // surface to bot.catch and stop polling.
  bot.on('inline_query', async (ctx) => {
    try {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'callit_notify_bot';
      const miniapp = `https://t.me/${botUsername}/play?startapp=${ctx.from.id}`;
      const keyboard = new InlineKeyboard().url('Play CallIt', miniapp);
      const card = db ? await lastCardByTgId(db, ctx.from.id).catch(() => null) : null;
      if (card) {
        await ctx.answerInlineQuery(
          [
            {
              type: 'photo',
              id: 'last-card',
              photo_file_id: card.fileId,
              caption: card.text ?? undefined,
              reply_markup: keyboard,
            },
          ],
          { cache_time: 0, is_personal: true },
        );
        return;
      }
      await ctx.answerInlineQuery(
        [
          {
            type: 'article',
            id: 'invite',
            title: 'Invite to CallIt',
            description: 'Call the market, win the pot — BTC calls on Sui.',
            input_message_content: {
              message_text: `Calling BTC on CallIt — join me: ${miniapp}`,
            },
            reply_markup: keyboard,
          },
        ],
        { cache_time: 0, is_personal: true },
      );
    } catch (err) {
      console.error('inline_query failed:', err);
    }
  });

  // a thrown middleware error otherwise stops polling AND rejects bot.start(),
  // which rejects the worker's Promise.all → process.exit, killing the keeper
  // and settlers too. Notifications must never take the worker down.
  bot.catch((err) => console.error('notify bot error:', err.error));

  return bot;
}

export interface SettlementCard {
  won: boolean;
  payoutDusdc: number;
  costDusdc: number;
  isUp: boolean;
  strikeUsd: number;
  settleUsd: number;
  streak: number;
  /** keeper claim digest (real custody only) — short link on the card */
  txDigest?: string;
  /** post-settlement balance, when the caller knows it (mock settler) */
  balanceDusdc?: number;
}

export function renderSettlementCard(card: SettlementCard): string {
  const dir = card.isUp ? 'UP' : 'DOWN';
  if (card.won) {
    return (
      `🎯 CALLED IT! +${card.payoutDusdc.toFixed(2)} dUSDC\n` +
      `BTC settled at $${card.settleUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} — your ${dir} call at $${card.strikeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} paid out.` +
      (card.streak >= 2 ? `\n🔥 Win streak ×${card.streak}` : '')
    );
  }
  return (
    `📉 MISSED CALL −${card.costDusdc.toFixed(2)} dUSDC\n` +
    `BTC settled at $${card.settleUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} — your ${dir} call at $${card.strikeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} didn’t land.\n` +
    'Run it back?'
  );
}

export async function sendSettlementDM(
  api: Api<RawApi>,
  db: Db,
  userId: string,
  card: SettlementCard,
  appUrl: string,
): Promise<boolean> {
  const chatId = await chatIdFor(db, userId);
  if (!chatId) return false;
  // Mini App deep link; startapp carries the sharer as referrer (logged at
  // the invitee's signup — the future invite-rewards hook, no payouts yet)
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'callit_notify_bot';
  const miniapp = `https://t.me/${botUsername}/play?startapp=${chatId}`;
  const share = card.won
    ? `I just called BTC ${card.isUp ? 'UP' : 'DOWN'} and won +${card.payoutDusdc.toFixed(2)} dUSDC on CallIt 🎯 ${miniapp}`
    : `Calling BTC on CallIt — join me: ${miniapp}`;
  const keyboard = new InlineKeyboard()
    .url('Play again', miniapp)
    .switchInline('Share', share);
  const caption = renderSettlementCard(card);

  // Render the PNG first, in its own guard. The send is OUTSIDE this try on
  // purpose: a render failure falls back to a text DM, but a sendPhoto
  // failure must NOT — Telegram may have already delivered the photo, so a
  // text fallback there would double-DM the settlement. Let send errors
  // propagate to the caller's .catch (logged once, at-most-once delivery).
  let png: Buffer | null = null;
  try {
    const { renderSettlementCardPng } = await import('./card.js');
    png = await renderSettlementCardPng(card);
  } catch (err) {
    console.error('card render failed, falling back to text:', err);
  }

  if (!png) {
    await api.sendMessage(chatId, caption, { reply_markup: keyboard });
    return true;
  }

  const msg = await api.sendPhoto(chatId, new InputFile(png, 'callit-card.png'), {
    caption,
    reply_markup: keyboard,
  });
  // remember the uploaded photo so the inline "Share" can re-serve it
  const sizes = (msg as { photo?: Array<{ file_id: string }> })?.photo;
  const fileId = sizes?.[sizes.length - 1]?.file_id;
  if (fileId) await setLastCard(db, userId, fileId, share).catch(() => {});
  return true;
}

/** Long-poll runner for Railway. Web tests use handleUpdate injection instead. */
export async function runBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN unset — notify bot disabled');
    return;
  }
  const bot = createBot({
    token,
    db: getDb(),
    appUrl: process.env.APP_URL ?? 'https://callit-seven.vercel.app',
  });
  console.log('notify bot starting (long polling)');
  await bot.start();
}
