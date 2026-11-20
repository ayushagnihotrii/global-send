/**
 * Global Send: Telegram MTProto Multi-Part Storage Router Test Suite
 * 
 * Verifies:
 * 1. Stateless Manifest StorageKey serialization & deserialization
 * 2. Multi-part slicing of massive files (e.g. 5GB/10GB simulation)
 * 3. Virtual stream concatenation (byte-for-byte fidelity)
 * 4. HTTP Range scrubbing & multi-part boundary seeking
 * 5. Atomic multi-part deletion on TTL expiration
 * 6. Quota and verification contracts
 * 7. Production environment configuration validation
 */

import assert from 'assert';
import crypto from 'crypto';
import { Readable } from 'stream';
import { TelegramStorageProvider } from './src/lib/storage/telegram-provider.ts';
import { validateStorageConfig, ConfigurationError } from './src/lib/env-config.ts';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
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

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

console.log('\n=== GLOBAL SEND TELEGRAM MULTI-PART STORAGE ROUTER SUITE ===\n');

// -------------------------------------------------------------
// Suite 1: Storage Key Manifest Serialization & Deserialization
// -------------------------------------------------------------
console.log('Suite 1: Storage Key Manifest Parsing & Integrity');

runTest('Builds and parses single-part telegram storage key', () => {
  const manifest = {
    channelId: '-1001234567890',
    parts: [{ partIndex: 0, messageId: 42, size: 1048576 }],
    totalSize: 1048576,
    filename: 'document.pdf',
    mimeType: 'application/pdf',
  };

  const key = TelegramStorageProvider.buildStorageKey(manifest);
  assert(key.startsWith('telegram://manifest'));
  assert(key.includes('channel=-1001234567890'));
  assert(key.includes('parts=42:1048576'));

  const parsed = TelegramStorageProvider.parseStorageKey(key);
  assert.strictEqual(parsed.channelId, '-1001234567890');
  assert.strictEqual(parsed.parts.length, 1);
  assert.strictEqual(parsed.parts[0].messageId, 42);
  assert.strictEqual(parsed.parts[0].size, 1048576);
  assert.strictEqual(parsed.totalSize, 1048576);
  assert.strictEqual(parsed.filename, 'document.pdf');
  assert.strictEqual(parsed.mimeType, 'application/pdf');
});

runTest('Builds and parses multi-part telegram storage key (10 GB virtual file across 5 parts)', () => {
  const partSize = 2147483648; // 2 GB each
  const parts = [
    { partIndex: 0, messageId: 101, size: partSize },
    { partIndex: 1, messageId: 102, size: partSize },
    { partIndex: 2, messageId: 103, size: partSize },
    { partIndex: 3, messageId: 104, size: partSize },
    { partIndex: 4, messageId: 105, size: partSize },
  ];
  const manifest = {
    channelId: '-100987654321',
    parts,
    totalSize: partSize * 5,
    filename: 'massive_video_4k.mkv',
    mimeType: 'video/x-matroska',
  };

  const key = TelegramStorageProvider.buildStorageKey(manifest);
  const parsed = TelegramStorageProvider.parseStorageKey(key);

  assert.strictEqual(parsed.parts.length, 5);
  assert.deepStrictEqual(
    parsed.parts.map((p) => p.messageId),
    [101, 102, 103, 104, 105]
  );
  assert.strictEqual(parsed.totalSize, 10737418240);
  assert.strictEqual(parsed.filename, 'massive_video_4k.mkv');
});

runTest('Rejects malformed telegram storage keys', () => {
  assert.throws(() => TelegramStorageProvider.parseStorageKey('s3://invalid/key'));
  assert.throws(() => TelegramStorageProvider.parseStorageKey('telegram://manifest'));
});

// -------------------------------------------------------------
// Suite 2: Multi-Part Slicing & Virtual Stream Reassembly
// -------------------------------------------------------------
console.log('\nSuite 2: Multi-Part Slicing & Virtual Concatenation');

await runAsyncTest('Slices payload into multiple parts and reassembles stream byte-for-byte', async () => {
  const mockStore = new Map();
  const provider = new TelegramStorageProvider(
    {
      apiId: 12345,
      apiHash: 'testhash',
      channelId: '-100999',
    },
    mockStore
  );

  // Generate test payload (3,500 bytes: slices into 4 parts in test mode)
  const originalPayload = crypto.randomBytes(3500);

  const uploadResult = await provider.uploadFile({
    storageKey: 'users/test/item1/file.bin',
    filename: 'data_archive.bin',
    mimeType: 'application/octet-stream',
    buffer: originalPayload,
    userId: 'user_test',
    itemId: 'item_test',
  });

  assert.strictEqual(uploadResult.provider, 'telegram');
  assert.strictEqual(uploadResult.size, 3500);
  assert(uploadResult.storageKey.startsWith('telegram://manifest'));

  const manifest = TelegramStorageProvider.parseStorageKey(uploadResult.storageKey);
  assert(manifest.parts.length >= 3, `Expected at least 3 parts, got ${manifest.parts.length}`);

  // Download entire file as a virtual concatenated stream
  const downloadResult = await provider.getDownloadStream(uploadResult.storageKey);
  assert.strictEqual(downloadResult.statusCode, 200);
  assert.strictEqual(downloadResult.size, 3500);
  assert.strictEqual(downloadResult.mimeType, 'application/octet-stream');

  const reassembled = await streamToBuffer(downloadResult.stream);
  assert.strictEqual(reassembled.length, originalPayload.length);
  assert(reassembled.equals(originalPayload), 'Reassembled stream must match original payload exactly');
});

// -------------------------------------------------------------
// Suite 3: HTTP Range Slicing & Instant Scrubbing
// -------------------------------------------------------------
console.log('\nSuite 3: Dynamic HTTP Range Seeking Across Parts');

await runAsyncTest('Fetches HTTP Range within a single part', async () => {
  const mockStore = new Map();
  const provider = new TelegramStorageProvider(
    {
      apiId: 12345,
      apiHash: 'testhash',
      channelId: '-100999',
    },
    mockStore
  );

  const originalPayload = crypto.randomBytes(4000);
  const uploadResult = await provider.uploadFile({
    storageKey: 'users/test/item2/video.mp4',
    filename: 'movie.mp4',
    mimeType: 'video/mp4',
    buffer: originalPayload,
    userId: 'user_test',
    itemId: 'item_test2',
  });

  // Request byte range [250, 499] (250 bytes)
  const rangeResult = await provider.getDownloadStream(uploadResult.storageKey, {
    start: 250,
    end: 499,
  });

  assert.strictEqual(rangeResult.statusCode, 206);
  assert.strictEqual(rangeResult.size, 250);
  assert.strictEqual(rangeResult.contentRange, 'bytes 250-499/4000');

  const slicedBuffer = await streamToBuffer(rangeResult.stream);
  assert.strictEqual(slicedBuffer.length, 250);
  assert(slicedBuffer.equals(originalPayload.subarray(250, 500)));
});

await runAsyncTest('Fetches HTTP Range that spans across multiple part boundaries', async () => {
  const mockStore = new Map();
  const provider = new TelegramStorageProvider(
    {
      apiId: 12345,
      apiHash: 'testhash',
      channelId: '-100999',
    },
    mockStore
  );

  const originalPayload = crypto.randomBytes(5000);
  const uploadResult = await provider.uploadFile({
    storageKey: 'users/test/item3/large.iso',
    filename: 'disk.iso',
    mimeType: 'application/octet-stream',
    buffer: originalPayload,
    userId: 'user_test',
    itemId: 'item_test3',
  });

  // Request byte range spanning across parts [800, 2200]
  const rangeResult = await provider.getDownloadStream(uploadResult.storageKey, {
    start: 800,
    end: 2200,
  });

  assert.strictEqual(rangeResult.statusCode, 206);
  assert.strictEqual(rangeResult.size, 1401);

  const slicedBuffer = await streamToBuffer(rangeResult.stream);
  assert.strictEqual(slicedBuffer.length, 1401);
  assert(slicedBuffer.equals(originalPayload.subarray(800, 2201)));
});

// -------------------------------------------------------------
// Suite 4: TTL Auto-Disintegration & Multi-Message Deletion
// -------------------------------------------------------------
console.log('\nSuite 4: Atomic Multi-Part Deletion on TTL Expiration');

await runAsyncTest('Permanently deletes all part messages simultaneously on expiration', async () => {
  const mockStore = new Map();
  const provider = new TelegramStorageProvider(
    {
      apiId: 12345,
      apiHash: 'testhash',
      channelId: '-100999',
    },
    mockStore
  );

  const originalPayload = crypto.randomBytes(3000);
  const uploadResult = await provider.uploadFile({
    storageKey: 'users/test/item4/secret.doc',
    filename: 'secret.doc',
    mimeType: 'application/msword',
    buffer: originalPayload,
    userId: 'user_test',
    itemId: 'item_test4',
  });

  const manifest = TelegramStorageProvider.parseStorageKey(uploadResult.storageKey);
  for (const part of manifest.parts) {
    assert(mockStore.has(`-100999:${part.messageId}`), `Part ${part.messageId} must exist prior to deletion`);
  }

  // Janitor executes deleteFile
  const deleteOk = await provider.deleteFile(uploadResult.storageKey);
  assert.strictEqual(deleteOk, true);

  for (const part of manifest.parts) {
    assert(!mockStore.has(`-100999:${part.messageId}`), `Part ${part.messageId} must be purged from storage`);
  }
});

// -------------------------------------------------------------
// Suite 5: Quota & Verification Contracts
// -------------------------------------------------------------
console.log('\nSuite 5: Infinite Quota & File Verification Contracts');

await runAsyncTest('Reports virtually unlimited storage quota', async () => {
  const provider = new TelegramStorageProvider();
  const quota = await provider.getQuota();
  assert.strictEqual(quota.provider, 'telegram');
  assert(quota.limitBytes >= 109951162777600); // 100 TB
  assert(quota.availableBytes >= 109951162777600);
});

await runAsyncTest('Verifies file existence and total byte size accurately', async () => {
  const provider = new TelegramStorageProvider();
  const fakeKey = 'telegram://manifest?channel=-100123&parts=1:5000,2:5000&total=10000&name=test.zip&mime=application%2Fzip';
  const verification = await provider.verifyFile(fakeKey);
  assert.strictEqual(verification.exists, true);
  assert.strictEqual(verification.size, 10000);
});

// -------------------------------------------------------------
// Suite 6: Environment & Production Safety Validation
// -------------------------------------------------------------
console.log('\nSuite 6: Production Configuration Safety');

runTest('Production fails fast when Telegram credentials are missing', () => {
  const prodEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://user:pass@ep-cool-db.supabase.co:5432/postgres',
    STORAGE_PROVIDER: 'telegram',
  };

  assert.throws(() => validateStorageConfig(prodEnv), (err) => {
    assert(err instanceof ConfigurationError);
    assert(err.missingVariables.includes('TELEGRAM_API_ID'));
    assert(err.missingVariables.includes('TELEGRAM_API_HASH'));
    assert(err.missingVariables.includes('TELEGRAM_STORAGE_CHANNEL_ID'));
    return true;
  });
});

runTest('Production succeeds with valid Telegram MTProto credentials', () => {
  const prodEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://user:pass@ep-cool-db.supabase.co:5432/postgres',
    STORAGE_PROVIDER: 'telegram',
    TELEGRAM_API_ID: '987654',
    TELEGRAM_API_HASH: 'abcdef1234567890abcdef1234567890',
    TELEGRAM_STORAGE_CHANNEL_ID: '-1001987654321',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  };

  const config = validateStorageConfig(prodEnv);
  assert.strictEqual(config.isProduction, true);
  assert.strictEqual(config.storage.driver, 'telegram');
  assert.strictEqual(config.storage.telegram.apiId, 987654);
  assert.strictEqual(config.storage.telegram.channelId, '-1001987654321');
});

runTest('Auto-detects Telegram provider when Telegram credentials are present', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://user:pass@ep-cool-db.supabase.co:5432/postgres',
    TELEGRAM_API_ID: '987654',
    TELEGRAM_API_HASH: 'abcdef1234567890abcdef1234567890',
    TELEGRAM_STORAGE_CHANNEL_ID: '-1001987654321',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  };

  const config = validateStorageConfig(env);
  assert.strictEqual(config.storage.driver, 'telegram');
});

console.log('\n========================================');
console.log(`SUMMARY: ${passedTests} passed, ${totalTests - passedTests} failed`);
console.log('========================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
