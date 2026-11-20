/**
 * Global Send: Client-Side Zero-Knowledge Encryption Engine
 * Uses WebCrypto API (AES-256-GCM) to encrypt and decrypt file chunks on the client.
 * 
 * Guarantees:
 * 1. Encryption keys never leave the client's device unencrypted.
 * 2. Send Mode: Key is encoded into the URL #fragment (never transmitted in HTTP headers).
 * 3. Vault Mode: File keys are wrapped using a Master Key derived from the user's private key.
 * 4. Deterministic unique IV per chunk prevents nonce reuse across multi-gigabyte uploads.
 */

// 12-byte IV for AES-GCM
export const GCM_IV_LENGTH_BYTES = 12;

/**
 * Encodes a buffer or Uint8Array to a URL-safe Base64 string (base64url).
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string (base64url) to a Uint8Array.
 */
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a random 256-bit symmetric encryption key for a file.
 */
export async function generateFileKey(): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  return subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable so we can place it in URL #fragment or wrap it
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a random 12-byte initialization vector base.
 */
export function generateIvBase(): Uint8Array {
  const iv = new Uint8Array(GCM_IV_LENGTH_BYTES);
  globalThis.crypto.getRandomValues(iv);
  return iv;
}

/**
 * Derives a unique 12-byte IV for a specific chunk index to guarantee no IV collision.
 * (Takes the 12-byte base IV and XORs / adds the 32-bit chunk index into the final 4 bytes).
 */
export function deriveChunkIv(baseIv: Uint8Array, chunkIndex: number): Uint8Array {
  const chunkIv = new Uint8Array(baseIv);
  const view = new DataView(chunkIv.buffer, chunkIv.byteOffset + 8, 4);
  const original = view.getUint32(0, false);
  view.setUint32(0, original ^ chunkIndex, false);
  return chunkIv;
}

/**
 * Exports a CryptoKey to a URL-safe base64 string for embedding into share link #fragment.
 */
export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const raw = await subtle.exportKey('raw', key);
  return bufferToBase64Url(raw);
}

/**
 * Imports a CryptoKey from a URL-safe base64 string.
 */
export async function importKeyFromBase64Url(base64url: string): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const raw = base64UrlToBuffer(base64url);
  return subtle.importKey(
    'raw',
    raw as any,
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a chunk buffer with AES-GCM using WebCrypto.
 * Returns the ciphertext (which includes the 16-byte GCM authentication tag appended).
 */
export async function encryptChunk(
  chunk: ArrayBuffer | Uint8Array,
  key: CryptoKey,
  chunkIndex: number,
  baseIv: Uint8Array
): Promise<ArrayBuffer> {
  const subtle = globalThis.crypto.subtle;
  const iv = deriveChunkIv(baseIv, chunkIndex);
  const data = chunk instanceof Uint8Array
    ? chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
    : chunk;

  return subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    data as any
  );
}

/**
 * Decrypts an encrypted chunk with AES-GCM using WebCrypto.
 */
export async function decryptChunk(
  encryptedChunk: ArrayBuffer | Uint8Array,
  key: CryptoKey,
  chunkIndex: number,
  baseIv: Uint8Array
): Promise<ArrayBuffer> {
  const subtle = globalThis.crypto.subtle;
  const iv = deriveChunkIv(baseIv, chunkIndex);
  const data = encryptedChunk instanceof Uint8Array
    ? encryptedChunk.buffer.slice(encryptedChunk.byteOffset, encryptedChunk.byteOffset + encryptedChunk.byteLength)
    : encryptedChunk;

  return subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    data as any
  );
}

/**
 * Derives a Master Key from a user's private login key and salt via PBKDF2.
 */
export async function deriveMasterKey(loginKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(loginKey) as any,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );
}

/**
 * Wraps (encrypts) a per-file key using the user's master vault key.
 */
export async function wrapFileKey(fileKey: CryptoKey, masterKey: CryptoKey): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const iv = generateIvBase();
  const wrapped = await subtle.wrapKey('raw', fileKey, masterKey, {
    name: 'AES-GCM',
    iv: iv as any,
  });

  // Pack IV + Wrapped Key together
  const combined = new Uint8Array(iv.length + wrapped.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrapped), iv.length);
  return bufferToBase64Url(combined);
}

/**
 * Unwraps (decrypts) a per-file key using the user's master vault key.
 */
export async function unwrapFileKey(wrappedKeyBase64: string, masterKey: CryptoKey): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const combined = base64UrlToBuffer(wrappedKeyBase64);
  const iv = combined.subarray(0, GCM_IV_LENGTH_BYTES);
  const wrappedData = combined.subarray(GCM_IV_LENGTH_BYTES);

  return subtle.unwrapKey(
    'raw',
    wrappedData as any,
    masterKey,
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt']
  );
}
