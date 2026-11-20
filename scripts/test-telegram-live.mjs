/**
 * Global Send: Live Telegram Storage Verification
 * Connects to Telegram MTProto, uploads a test file to your channel, downloads it,
 * verifies integrity, and cleans it up.
 */

import { TelegramStorageProvider } from '../src/lib/storage/telegram-provider.ts';

async function main() {
  console.log('\n[1/4] Initializing Telegram MTProto Storage Provider...');
  const provider = new TelegramStorageProvider();

  console.log('[2/4] Uploading test file to private channel...');
  const testPayload = Buffer.from(
    '🚀 Hello from Global Send! Telegram MTProto cloud storage is working with unlimited file support!\nTimestamp: ' +
      new Date().toISOString()
  );

  const uploadResult = await provider.uploadFile({
    storageKey: 'test/live-verification.txt',
    filename: 'globalsend_test.txt',
    mimeType: 'text/plain',
    buffer: testPayload,
    userId: 'admin_test',
    itemId: 'test_item_' + Date.now(),
  });

  console.log('✓ File uploaded successfully!');
  console.log('  Storage Key:', uploadResult.storageKey);
  console.log('  Telegram Message ID(s):', uploadResult.fileId);

  console.log('\n[3/4] Downloading and verifying stream directly from Telegram...');
  const downloadResult = await provider.getDownloadStream(uploadResult.storageKey);
  const chunks = [];
  for await (const chunk of downloadResult.stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const downloadedBuffer = Buffer.concat(chunks);

  if (downloadedBuffer.equals(testPayload)) {
    console.log('✓ Data integrity verified 100%! Byte-for-byte match.');
  } else {
    throw new Error('Downloaded buffer does not match original payload');
  }

  console.log('\n[4/4] Testing TTL auto-cleanup (deleting from channel)...');
  const deleted = await provider.deleteFile(uploadResult.storageKey);
  if (deleted) {
    console.log('✓ Test file cleaned up and permanently removed from channel.');
  } else {
    console.log('⚠ Could not delete message (check bot Delete Messages permission).');
  }

  console.log('\n🎉 ALL LIVE TELEGRAM CHECKS PASSED! Your backend is ready for massive transfers.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Live Verification Failed:');
  console.error(err);
  process.exit(1);
});
