import { chatIdFor, getDb } from '@callit/db';

/**
 * Settlement DM from the web side (mock-mode settlements are client- or
 * worker-driven, not keeper-driven). Raw Bot API call — grammY stays in the
 * worker. Exactly-once is guaranteed by the caller gating on the pick's
 * open→settled transition.
 */
export async function notifySettlementDM(
  userId: string,
  card: {
    won: boolean;
    payoutDusdc: number;
    costDusdc: number;
    isUp: boolean;
    strikeUsd: number;
    settleUsd: number;
    streak: number;
  },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const db = getDb();
  if (!token || !db) return;
  const chatId = await chatIdFor(db, userId).catch(() => null);
  if (!chatId) return;

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const dir = card.isUp ? 'UP' : 'DOWN';
  const text = card.won
    ? `🎯 CALLED IT! +${card.payoutDusdc.toFixed(2)} dUSDC\n` +
      `BTC settled at $${fmt(card.settleUsd)} — your ${dir} call at $${fmt(card.strikeUsd)} paid out.` +
      (card.streak >= 2 ? `\n🔥 Win streak ×${card.streak}` : '')
    : `📉 MISSED CALL −${card.costDusdc.toFixed(2)} dUSDC\n` +
      `BTC settled at $${fmt(card.settleUsd)} — your ${dir} call at $${fmt(card.strikeUsd)} didn’t land.\nRun it back?`;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'callit_notify_bot';
  const miniapp = `https://t.me/${botUsername}/play?startapp=${chatId}`;
  const share = card.won
    ? `I just called BTC ${dir} and won +${card.payoutDusdc.toFixed(2)} dUSDC on CallIt 🎯 ${miniapp}`
    : `Calling BTC on CallIt — join me: ${miniapp}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[
          { text: 'Play again', url: miniapp },
          { text: 'Share', switch_inline_query: share },
        ]],
      },
    }),
  }).catch((err) => console.error('settlement DM failed:', err));
}
