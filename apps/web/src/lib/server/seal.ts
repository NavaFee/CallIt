import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM cookie sealing for the dev session provider.
 * Key is derived from SESSION_SECRET; payloads are short JSON blobs
 * (session keypair, mock ledger). Not a substitute for zkLogin — the
 * production auth provider replaces this entirely.
 */

function key(): Buffer {
  const secret = process.env.SESSION_SECRET ?? 'callit-dev-secret-change-me';
  return createHash('sha256').update(secret).digest();
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ciphertext, tag].map((b) => b.toString('base64url')).join('.');
}

export function unseal<T>(sealed: string): T | null {
  try {
    const [ivB64, ctB64, tagB64] = sealed.split('.');
    if (!ivB64 || !ctB64 || !tagB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    return null;
  }
}
