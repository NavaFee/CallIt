import { Bot, InlineKeyboard, type Api, type RawApi } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { bindTelegram, chatIdFor, getDb, type Db } from '@callit/db';

/**
 * CallIt notify bot — notifications only, never custody or trading.
 * - /start <code> binds a Telegram chat to a CallIt account (deep link
 *   minted by the web profile screen)
 * - settlement DMs: result card + share button after the keeper claims
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
    const userId = await bindTelegram(db, code, ctx.chat.id);
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
  await api.sendMessage(chatId, renderSettlementCard(card), { reply_markup: keyboard });
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
