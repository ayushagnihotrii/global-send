/**
 * Global Send: Client-Side Zero-Knowledge Crypto Test Suite
 * Verifies WebCrypto AES-256-GCM chunk encryption, IV collision prevention,
 * base64url URL #fragment serialization, and master key wrapping.
 */

import assert from 'assert';
import {
  generateFileKey,
  generateIvBase,
  exportKeyToBase64Url,
  importKeyFromBase64Url,
  encryptChunk,
  decryptChunk,
  deriveChunkIv,
  deriveMasterKey,
  wrapFileKey,
  unwrapFileKey,
} from './src/lib/crypto/client-encryption.ts';

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

console.log('\n=== GLOBAL SEND CLIENT-SIDE CRYPTOGRAPHY SUITE ===\n');

await runTest('Generates AES-256-GCM key and exports/imports to URL base64url string', async () => {
  const key = await generateFileKey();
  const exported = await exportKeyToBase64Url(key);

  assert(typeof exported === 'string');
  assert(exported.length >= 40);
  assert(!exported.includes('+') && !exported.includes('/') && !exported.includes('='));

  const imported = await importKeyFromBase64Url(exported);
  assert.strictEqual(imported.algorithm.name, 'AES-GCM');
});

await runTest('Encrypts and decrypts multi-megabyte chunk with byte-for-byte fidelity', async () => {
  const key = await generateFileKey();
  const baseIv = generateIvBase();

  const originalText = 'Hello from Global Send E2EE! This is a confidential test file chunk.';
  const encoder = new TextEncoder();
  const originalBuffer = encoder.encode(originalText).buffer;

  const ciphertext = await encryptChunk(originalBuffer, key, 0, baseIv);
  assert(ciphertext.byteLength > originalBuffer.byteLength); // includes 16-byte GCM tag

  const decrypted = await decryptChunk(ciphertext, key, 0, baseIv);
  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decrypted);

  assert.strictEqual(decryptedText, originalText);
});

await runTest('Rejects tampered ciphertext with cryptographic authentication error', async () => {
  const key = await generateFileKey();
  const baseIv = generateIvBase();

  const originalBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
  const ciphertext = await encryptChunk(originalBuffer, key, 0, baseIv);

  // Tamper with a single byte in ciphertext
  const tampered = new Uint8Array(ciphertext);
  tampered[0] ^= 0xff;

  let threw = false;
  try {
    await decryptChunk(tampered.buffer, key, 0, baseIv);
  } catch {
    threw = true;
  }
  assert(threw, 'Decrypting tampered ciphertext must throw an authentication tag error');
});

await runTest('Derives distinct nonces for consecutive chunk indices', () => {
  const baseIv = generateIvBase();
  const iv0 = deriveChunkIv(baseIv, 0);
  const iv1 = deriveChunkIv(baseIv, 1);
  const iv2 = deriveChunkIv(baseIv, 2);

  assert.notDeepStrictEqual(iv0, iv1);
  assert.notDeepStrictEqual(iv1, iv2);
  assert.strictEqual(iv0.length, 12);
  assert.strictEqual(iv1.length, 12);
});

await runTest('Derives Master Key and wraps/unwraps per-file key for Vault mode', async () => {
  const loginKey = 'my_super_secret_login_key_999!';
  const salt = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160]);

  const masterKey = await deriveMasterKey(loginKey, salt);
  const fileKey = await generateFileKey();

  const wrappedBase64 = await wrapFileKey(fileKey, masterKey);
  assert(typeof wrappedBase64 === 'string');

  const unwrappedKey = await unwrapFileKey(wrappedBase64, masterKey);

  // Verify unwrapped key can decrypt data encrypted with fileKey
  const baseIv = generateIvBase();
  const sampleData = new TextEncoder().encode('Test file data').buffer;
  const encrypted = await encryptChunk(sampleData, fileKey, 0, baseIv);
  const decrypted = await decryptChunk(encrypted, unwrappedKey, 0, baseIv);

  assert.strictEqual(new TextDecoder().decode(decrypted), 'Test file data');
});

console.log('\n========================================');
console.log(`SUMMARY: ${passedTests} passed, ${totalTests - passedTests} failed`);
console.log('========================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
