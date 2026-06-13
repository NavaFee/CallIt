import { clearTgBinding, getDb, linkTelegramAccount, setTgUsername, userByTgId } from '@callit/db';
import { createAccount, type Session } from './session';
import { seal, unseal } from './seal';

/**
 * Shared Telegram account resolution, used by both the (dormant) Login Widget
 * endpoint and the bot-nonce poll endpoint. Decides between restoring an
 * existing tg-bound account (login), binding the current guest account
 * (link), or creating a fresh tg-bound account.
 *
 * mode 'link' + a different account already owns the tg id ⇒ conflict (the
 * D-15 switch-flow signal); 'login' always restores the existing account.
 */
export type TgLoginOutcome =
  | {
      ok: true;
      session: Session;
      merged: boolean;
      airdroppedUnits: bigint;
      airdropFailed: boolean;
    }
  | { ok: false; code: 'tg-already-bound' };

export async function resolveTgLogin(
  current: Session | null,
  tgId: number,
  tgUsername: string | undefined,
  mode: 'login' | 'link',
): Promise<TgLoginOutcome> {
  const db = getDb();
  const existing = db ? await userByTgId(db, tgId) : null;

  // this tg id already owns an account → restore it (unless a 'link' from a
  // different guest account, which is a conflict the UI resolves)
  if (existing?.sessionKeySealed) {
    const sk = unseal<string>(existing.sessionKeySealed);
    if (sk) {
      if (mode === 'link' && current && current.address !== existing.id) {
        return { ok: false, code: 'tg-already-bound' };
      }
      if (db && tgUsername) await setTgUsername(db, tgId, tgUsername).catch(() => {});
      return {
        ok: true,
        session: {
          sk,
          address: existing.id,
          managerId: existing.managerId,
          createdAt: Date.now(),
          provider: 'telegram',
        },
        merged: true,
        airdroppedUnits: 0n,
        airdropFailed: false,
      };
    }
    // legacy row with an unusable key — free the unique tg index
    if (db) await clearTgBinding(db, tgId).catch(() => {});
  }

  // fresh tg id with a current guest account → bind it (recoverable account)
  if (current) {
    if (!db) throw new Error('linking needs the account database on this deployment');
    const outcome = await linkTelegramAccount(db, {
      userId: current.address,
      managerId: current.managerId,
      tgChatId: tgId,
      tgUsername,
      sessionKeySealed: seal(current.sk),
    });
    if (outcome === 'conflict') return { ok: false, code: 'tg-already-bound' };
    return {
      ok: true,
      session: { ...current, provider: 'telegram' },
      merged: false,
      airdroppedUnits: 0n,
      airdropFailed: false,
    };
  }

  // no session, unknown tg id → brand-new tg-bound account
  const result = await createAccount({ provider: 'telegram', tgChatId: tgId, tgUsername });
  return {
    ok: true,
    session: result.session,
    merged: false,
    airdroppedUnits: result.airdroppedUnits,
    airdropFailed: result.airdropFailed,
  };
}
