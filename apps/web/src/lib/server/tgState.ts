import { getDb, tgInfoFor } from '@callit/db';
import type { Session } from './session';

/**
 * Login Widget config for the browser. Derived from the server envs (the
 * bot id is the numeric token prefix) so no extra NEXT_PUBLIC var is needed.
 * Null ⇒ the deployment can't offer "Continue with Telegram".
 */
export function tgWidgetConfig(): { botId: string; botUsername: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const botId = token?.split(':')[0];
  if (!botId || !botUsername) return null;
  return { botId, botUsername };
}

/**
 * Is this session backed by a Telegram identity? Cookie provider covers
 * DB-less deployments (set on widget login/link and Mini App login); the
 * users.tg_chat_id row covers older cookies and the bot /start bind flow.
 */
export async function tgLinkState(
  session: Session,
): Promise<{ linked: boolean; username: string | null }> {
  const db = getDb();
  const info = db
    ? await tgInfoFor(db, session.address).catch(() => ({ chatId: null, username: null }))
    : { chatId: null, username: null };
  return {
    linked: session.provider === 'telegram' || info.chatId !== null,
    username: info.username,
  };
}
