/**
 * Dev wallet handling for CLI runs.
 *
 * Resolution order:
 *   1. PRIVATE_KEY env var (bech32 `suiprivkey1...`)
 *   2. .wallets/dev.key at the repo root (gitignored)
 *   3. generate a fresh Ed25519 keypair and persist it to (2)
 *
 * The persisted dev wallet holds the demo PredictManager and the position we
 * settle on camera — do not regenerate it casually.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const WALLET_DIR = path.join(REPO_ROOT, '.wallets');
const DEV_KEY_PATH = path.join(WALLET_DIR, 'dev.key');
const MANAGER_PATH = path.join(WALLET_DIR, 'dev.manager');

export function loadOrCreateKeypair(): { keypair: Ed25519Keypair; source: string } {
  const envKey = process.env.PRIVATE_KEY;
  if (envKey) {
    return { keypair: keypairFromBech32(envKey), source: 'env:PRIVATE_KEY' };
  }
  if (existsSync(DEV_KEY_PATH)) {
    const stored = readFileSync(DEV_KEY_PATH, 'utf8').trim();
    return { keypair: keypairFromBech32(stored), source: DEV_KEY_PATH };
  }
  const keypair = Ed25519Keypair.generate();
  mkdirSync(WALLET_DIR, { recursive: true });
  writeFileSync(DEV_KEY_PATH, keypair.getSecretKey(), { mode: 0o600 });
  return { keypair, source: `${DEV_KEY_PATH} (newly generated)` };
}

function keypairFromBech32(key: string): Ed25519Keypair {
  const { scheme, secretKey } = decodeSuiPrivateKey(key);
  if (scheme !== 'ED25519') {
    throw new Error(`unsupported key scheme ${scheme}; use an ed25519 suiprivkey`);
  }
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/** The dev wallet's PredictManager id, persisted after create_manager. */
export function loadManagerId(): string | null {
  if (process.env.MANAGER_ID) return process.env.MANAGER_ID;
  if (existsSync(MANAGER_PATH)) return readFileSync(MANAGER_PATH, 'utf8').trim();
  return null;
}

export function saveManagerId(managerId: string): void {
  mkdirSync(WALLET_DIR, { recursive: true });
  writeFileSync(MANAGER_PATH, managerId);
}
