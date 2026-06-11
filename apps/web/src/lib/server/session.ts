import { cookies } from 'next/headers';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { dusdcToUnits, transferDusdc } from '@callit/core';
import { WELCOME_DUSDC } from '../welcome';
import { MOCK_FUNDS, cfg, predictService, suiClient } from './clients';
import { seal, unseal } from './seal';
import { ledgerStore } from './ledger';
import { getDb, upsertAccount } from '@callit/db';

/**
 * Dev-fallback auth provider: a server-generated ed25519 session wallet,
 * sealed into an httpOnly cookie. The AuthProvider seam is where zkLogin +
 * Enoki slots in (same Session shape, JWT-derived address, sponsored gas) —
 * see provider() below.
 */

const SESSION_COOKIE = 'callit_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export interface Session {
  /** bech32 suiprivkey of the session wallet (dev provider only) */
  sk: string;
  address: string;
  managerId: string | null;
  createdAt: number;
  provider: 'dev' | 'telegram';
  /** last daily-refill claim (ms) — rate limit lives in the sealed cookie */
  lastTopupAt?: number;
}

export { WELCOME_DUSDC } from '../welcome';
/** SUI sent to a fresh session wallet so it can pay its own gas on testnet. */
const WELCOME_GAS_SUI = 50_000_000n; // 0.05 SUI in MIST

export function getSession(): Session | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return unseal<Session>(raw);
}

export function saveSession(session: Session): void {
  cookies().set(SESSION_COOKIE, seal(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export function sessionKeypair(session: Session): Ed25519Keypair {
  return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(session.sk).secretKey);
}

function sponsorKeypair(): Ed25519Keypair | null {
  const key = process.env.SPONSOR_KEY ?? process.env.OPS_WALLET_KEY;
  if (!key) return null;
  return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey);
}

export interface RegistrationResult {
  session: Session;
  airdroppedUnits: bigint;
  /** true when no sponsor key is configured, so no on-chain account was made */
  managerSkipped: boolean;
  /** real mode: welcome transfer failed or the pool hit its reserve floor */
  airdropFailed: boolean;
}

/** Demo-day reserve: real airdrops never draw the ops pool below this. */
function reserveUnits(): bigint {
  return dusdcToUnits(Number(process.env.OPS_RESERVE_DUSDC ?? '250'));
}

/**
 * Registration: session wallet → gas grant → create_manager → welcome airdrop.
 * Idempotent: an existing session is returned untouched.
 */
export async function registerSession(): Promise<RegistrationResult> {
  const existing = getSession();
  if (existing) {
    return {
      session: existing,
      airdroppedUnits: 0n,
      managerSkipped: existing.managerId === null,
      airdropFailed: false,
    };
  }
  const result = await createAccount({ provider: 'dev' });
  saveSession(result.session);
  return result;
}

/**
 * Account creation shared by web registration and the Mini App: session
 * wallet → sponsored on-chain manager → welcome airdrop → DB persistence
 * (sealed key, so the same account opens on any device/host).
 * Does NOT write the cookie — callers decide.
 */
export async function createAccount(opts: {
  provider: 'dev' | 'telegram';
  tgChatId?: number;
  referrerId?: string;
}): Promise<RegistrationResult> {
  const keypair = Ed25519Keypair.generate();
  const address = keypair.getPublicKey().toSuiAddress();
  const session: Session = {
    sk: keypair.getSecretKey(),
    address,
    managerId: null,
    createdAt: Date.now(),
    provider: opts.provider,
  };

  // on-chain account, sponsored by the ops wallet (dev stand-in for Enoki)
  const sponsor = sponsorKeypair();
  if (sponsor) {
    const grant = new Transaction();
    const [gas] = grant.splitCoins(grant.gas, [WELCOME_GAS_SUI]);
    grant.transferObjects([gas!], address);
    const grantResult = await suiClient.signAndExecuteTransaction({
      transaction: grant,
      signer: sponsor,
      options: { showEffects: true },
    });
    if (grantResult.effects?.status.status !== 'success') {
      throw new Error(`gas grant failed: ${JSON.stringify(grantResult.effects?.status)}`);
    }
    await suiClient.waitForTransaction({ digest: grantResult.digest });

    const createResult = await suiClient.signAndExecuteTransaction({
      transaction: predictService.buildCreateManagerTx(),
      signer: keypair,
      options: { showEffects: true, showObjectChanges: true },
    });
    if (createResult.effects?.status.status !== 'success') {
      throw new Error(`create_manager failed: ${JSON.stringify(createResult.effects?.status)}`);
    }
    await suiClient.waitForTransaction({ digest: createResult.digest });
    session.managerId = predictService.extractManagerId(createResult);
  }

  // persist the account before any ledger write (ledgers.user_id FK) — and
  // so the same account can be reopened from any device (Mini App)
  const db = getDb();
  if (db) {
    await upsertAccount(db, {
      id: address,
      managerId: session.managerId,
      tgChatId: opts.tgChatId,
      sessionKeySealed: seal(session.sk),
      referrerId: opts.referrerId,
    }).catch((err) => console.error('account persist failed:', err));
  }

  // welcome stack: mock ledger credit, or a real ops-wallet dUSDC transfer
  let airdroppedUnits = 0n;
  let airdropFailed = false;
  if (MOCK_FUNDS) {
    airdroppedUnits = dusdcToUnits(WELCOME_DUSDC);
    const store = ledgerStore();
    const state = (await store.load(address)) ?? { balanceUnits: '0', nonce: 0, positions: [] };
    state.balanceUnits = (BigInt(state.balanceUnits) + airdroppedUnits).toString();
    await store.save(address, state);
  } else if (sponsor) {
    // never break registration on a failed airdrop — degrade gracefully and
    // never draw the pool below the demo-day reserve
    try {
      const ops = sponsor.getPublicKey().toSuiAddress();
      const pool = BigInt(
        (await suiClient.getBalance({ owner: ops, coinType: cfg.dusdcCoinType })).totalBalance,
      );
      const amount = dusdcToUnits(WELCOME_DUSDC);
      if (pool - amount < reserveUnits()) {
        airdropFailed = true;
      } else {
        await transferDusdc(suiClient, cfg, sponsor, address, amount);
        airdroppedUnits = amount;
      }
    } catch (err) {
      console.error('welcome airdrop failed:', err);
      airdropFailed = true;
    }
  } else {
    airdropFailed = true;
  }

  return { session, airdroppedUnits, managerSkipped: session.managerId === null, airdropFailed };
}
