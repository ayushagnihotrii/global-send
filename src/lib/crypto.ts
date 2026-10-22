/**
 * Global Send: Server-Side Cryptographic Utilities
 * Provides AES-256-GCM authenticated encryption for sensitive tokens at rest.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'globalsend_default_dev_secret_32bytes!!';
  // Derive a deterministic 32-byte key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string (e.g., Google OAuth refresh token) using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted token string.
 * Supports transparent fallback if the token was stored as plaintext before encryption was enabled.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';

  // If not encrypted with our prefix, return as-is (graceful fallback)
  if (!encryptedString.startsWith(PREFIX)) {
    return encryptedString;
  }

  try {
    const key = getEncryptionKey();
    const payload = encryptedString.slice(PREFIX.length);
    const [ivHex, tagHex, dataHex] = payload.split(':');

    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Malformed encrypted token format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    console.error('[Global Send Security] Failed to decrypt stored token:', err.message);
    throw new Error('Failed to decrypt stored token. Encryption key may have changed.');
  }
}
