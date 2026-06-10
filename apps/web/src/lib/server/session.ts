import { cookies } from 'next/headers';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { dusdcToUnits } from '@callit/core';
import { MOCK_FUNDS, predictService, suiClient } from './clients';
import { seal, unseal } from './seal';
import { ledgerStoreFor } from './cookieLedger';

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
  provider: 'dev';
}

export const WELCOME_DUSDC = 100;
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
}

/**
 * Registration: session wallet → gas grant → create_manager → welcome airdrop.
 * Idempotent: an existing session is returned untouched.
 */
export async function registerSession(): Promise<RegistrationResult> {
  const existing = getSession();
  if (existing) {
    return { session: existing, airdroppedUnits: 0n, managerSkipped: existing.managerId === null };
  }

  const keypair = Ed25519Keypair.generate();
  const address = keypair.getPublicKey().toSuiAddress();
  const session: Session = {
    sk: keypair.getSecretKey(),
    address,
    managerId: null,
    createdAt: Date.now(),
    provider: 'dev',
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

  // welcome stack: mock credit now; ops-wallet dUSDC transfer once funded
  let airdroppedUnits = 0n;
  if (MOCK_FUNDS) {
    airdroppedUnits = dusdcToUnits(WELCOME_DUSDC);
    const store = ledgerStoreFor();
    const state = (await store.load(address)) ?? { balanceUnits: '0', nonce: 0, positions: [] };
    state.balanceUnits = (BigInt(state.balanceUnits) + airdroppedUnits).toString();
    await store.save(address, state);
  }

  saveSession(session);
  return { session, airdroppedUnits, managerSkipped: session.managerId === null };
}
