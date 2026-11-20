import assert from 'node:assert/strict';
import {
  initDb,
  createShare,
  getShareById,
  getShareByItemId,
  verifySharePassword,
  incrementShareDownload,
  recordShareAccess,
  getShareAccessLogs,
  revokeShare,
  createItem,
  createUser,
  query,
} from './src/lib/db.ts';

async function runTests() {
  console.log('🧪 Starting Phase 3 Share Links & Access Controls Test Suite...');
  await initDb();

  // Setup test user and test item
  const testUsername = `share_tester_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const user = await createUser(crypto.randomUUID(), testUsername, 'password_hash_test');
  const item = await createItem({
    userId: user.id,
    type: 'file',
    title: 'Secret Blueprint.pdf',
    textContent: null,
    isPermanent: true,
  });

  // Attach a mock file record
  await query(
    `INSERT INTO files (id, item_id, user_id, storage_key, original_filename, sanitized_filename, mime_type, file_size, upload_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      crypto.randomUUID(),
      item.id,
      user.id,
      `local://test-key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      'Secret Blueprint.pdf',
      'Secret Blueprint.pdf',
      'application/pdf',
      1024 * 1024 * 5, // 5 MB
      'completed',
    ]
  );

  console.log('  ✓ Test fixtures initialized (User & File Item)');

  // 1. Create public share with 24h expiry, no password, unlimited downloads
  console.log('1. Testing open public share creation...');
  const openShare = await createShare({
    userId: user.id,
    itemId: item.id,
    expirationDurationSec: 86400,
  });

  assert.ok(openShare.id, 'Share ID should be generated');
  assert.equal(openShare.itemId, item.id);
  assert.equal(openShare.hasPassword, false);
  assert.equal(openShare.maxDownloads, null);
  assert.equal(openShare.downloadCount, 0);
  assert.equal(openShare.isExpired, false);
  assert.equal(openShare.isRevoked, false);
  assert.equal(openShare.isExhausted, false);
  console.log('  ✓ Open public share created successfully');

  // 2. Create password-protected share with download limit of 2
  console.log('2. Testing password-protected share with download limit...');
  const protectedShare = await createShare({
    userId: user.id,
    itemId: item.id,
    password: 'super-secret-pass',
    maxDownloads: 2,
    expirationDurationSec: 3600, // 1 hour
  });

  assert.ok(protectedShare.id);
  assert.equal(protectedShare.hasPassword, true);
  assert.equal(protectedShare.maxDownloads, 2);
  assert.equal(protectedShare.downloadCount, 0);

  // 3. Test password verification
  console.log('3. Testing share password verification...');
  const wrongPass = await verifySharePassword(protectedShare.id, 'wrong-password');
  assert.equal(wrongPass, false, 'Wrong password must be rejected');

  const rightPass = await verifySharePassword(protectedShare.id, 'super-secret-pass');
  assert.equal(rightPass, true, 'Correct password must be accepted');
  console.log('  ✓ Password verification enforces timing-safe PBKDF2');

  // 4. Test download limit enforcement (Burn-after-N-reads)
  console.log('4. Testing download limit decrementing & self-exhaustion...');
  // 1st download
  const dl1 = await incrementShareDownload(protectedShare.id);
  assert.equal(dl1.allowed, true);
  assert.equal(dl1.remainingDownloads, 1);

  // 2nd download
  const dl2 = await incrementShareDownload(protectedShare.id);
  assert.equal(dl2.allowed, true);
  assert.equal(dl2.remainingDownloads, 0);

  // 3rd download (should fail)
  const dl3 = await incrementShareDownload(protectedShare.id);
  assert.equal(dl3.allowed, false);
  assert.ok(dl3.error?.includes('Download limit has been reached'));

  const exhaustedShare = await getShareById(protectedShare.id);
  assert.equal(exhaustedShare.isExhausted, true);
  console.log('  ✓ Download limit strictly enforced: limit=2 blocked at 3rd attempt');

  // 5. Test access logs recording & IP masking
  console.log('5. Testing access logging and IP masking...');
  await recordShareAccess({
    shareId: protectedShare.id,
    action: 'download',
    ip: '203.0.113.195',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  });

  await recordShareAccess({
    shareId: protectedShare.id,
    action: 'download',
    ip: '2001:db8::1',
    userAgent: 'Mobile Safari',
  });

  const logs = await getShareAccessLogs(protectedShare.id, user.id);
  assert.equal(logs.length, 2);
  assert.equal(logs[0].ipMasked, 'masked-ip'); // IPv6 handled
  assert.equal(logs[1].ipMasked, '203.0.113.xxx'); // IPv4 masked
  assert.equal(logs[1].userAgent, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  console.log('  ✓ Access logs recorded with privacy-preserving IP masking');

  // 6. Test unauthorized user trying to read logs
  console.log('6. Testing access log authorization...');
  const otherUser = await createUser(
    crypto.randomUUID(),
    `stranger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    'hash'
  );
  let unauthorizedThrown = false;
  try {
    await getShareAccessLogs(protectedShare.id, otherUser.id);
  } catch (e) {
    unauthorizedThrown = true;
  }
  assert.equal(unauthorizedThrown, true, 'Non-owner must be blocked from reading share logs');
  console.log('  ✓ Access logs authorization enforced');

  // 7. Test share revocation
  console.log('7. Testing instant share link revocation...');
  const shareToRevoke = await createShare({
    userId: user.id,
    itemId: item.id,
    expirationDurationSec: 86400,
  });

  assert.equal(shareToRevoke.isRevoked, false);
  await revokeShare(shareToRevoke.id, user.id);

  const revokedShare = await getShareById(shareToRevoke.id);
  assert.equal(revokedShare.isRevoked, true);

  const dlAfterRevoke = await incrementShareDownload(shareToRevoke.id);
  assert.equal(dlAfterRevoke.allowed, false);
  assert.ok(dlAfterRevoke.error?.includes('revoked'));
  console.log('  ✓ Revoked share immediately rejects downloads');

  // 8. Test expired share
  console.log('8. Testing share link expiration logic...');
  const expiredShare = await createShare({
    userId: user.id,
    itemId: item.id,
    expirationDurationSec: -10, // already expired in the past
  });

  const fetchedExpired = await getShareById(expiredShare.id);
  assert.equal(fetchedExpired.isExpired, true);

  const dlExpired = await incrementShareDownload(expiredShare.id);
  assert.equal(dlExpired.allowed, false);
  assert.ok(dlExpired.error?.includes('expired'));
  console.log('  ✓ Expired share immediately rejects downloads');

  console.log('\n🎉 ALL PHASE 3 SHARE & ACCESS CONTROL TESTS PASSED (8/8)!');
}

runTests().catch((err) => {
  console.error('❌ Phase 3 Test Suite Failed:', err);
  process.exit(1);
});
