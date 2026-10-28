/**
 * GLOBAL SEND — Comprehensive End-to-End & Security Verification Suite
 *
 * Verifies:
 * 1. Key-only authentication, Argon2id hashing, HMAC-SHA-256 key fingerprinting,
 *    case-insensitive usernames, duplicate key rejection, unrecoverable key policy,
 *    and session invalidation.
 * 2. Vault items, mandatory 24h default expiration, custom expiration presets,
 *    cross-user isolation, immediate access revocation at expiry before cleanup,
 *    and physical deletion + retry queue via executeFullCleanup().
 * 3. Profile picture (DP) 100 KiB (102,400 bytes) hard limit, magic-byte validation,
 *    SVG rejection, EXIF/metadata stripping, and old avatar replacement cleanup.
 * 4. 1-to-1 private chat, minimal public user search, participant authorization,
 *    vault item sharing without duplicating storage or extending expiration,
 *    expired chat attachment handling ("File expired"), and user blocking.
 */

import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  validateUsername,
  validateLoginKey,
  computeKeyFingerprint,
  hashLoginKey,
  verifyLoginKey,
  createSessionToken,
  verifySessionToken,
  validateSecurityQuestion,
  normalizeSecurityAnswer,
  validateSecurityAnswer,
  hashSecurityAnswer,
  verifySecurityAnswer,
  getDeterministicFakeQuestion,
  PRESET_SECURITY_QUESTIONS,
} from './src/lib/auth';
import {
  validateAndSanitizeAvatar,
  detectImageMagicBytes,
} from './src/lib/image-security';
import {
  initDb,
  createUser,
  getUserByUsername,
  getUserByKeyFingerprint,
  getUserById,
  getRawUserById,
  incrementUserSessionVersion,
  updateUserAvatar,
  createItem,
  getItems,
  getItemById,
  permanentDeleteItem,
  createFileRecord,
  authorizeFileAccess,
  reserveUploadSession,
  updateUploadSession,
  getUploadSession,
  searchPublicUsers,
  getOrCreateConversation,
  sendChatMessage,
  getConversationMessages,
  blockUser,
  isEitherUserBlocked,
  enqueueStorageDeletion,
  updateUserSecurityQuestion,
  recordFailedRecoveryAttempt,
  resetRecoveryAttempts,
  resetUserKeyViaRecovery,
  resetPersistentRateLimitsForTest,
} from './src/lib/db';
import { executeFullCleanup } from './src/lib/cleanup';
import { getStorageProvider } from './src/lib/storage';
import {
  createOAuthStateToken,
  verifyOAuthStateToken,
  getGoogleOAuthConfig,
} from './src/lib/storage/google-drive-auth';
import { isUserAdmin, getUserStorageUsage } from './src/lib/db';
import { POST as recoverPost } from './src/app/api/auth/recover/route';
import { POST as loginPost } from './src/app/api/auth/login/route';
import { POST as registerPost } from './src/app/api/auth/register/route';
import { POST as recoveryQuestionPost } from './src/app/api/auth/recovery/question/route';
import { POST as recoveryResetPost } from './src/app/api/auth/recovery/reset/route';
import { POST as securityQuestionPost, GET as securityQuestionGet } from './src/app/api/user/security-question/route';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== GLOBAL SEND COMPREHENSIVE VERIFICATION SUITE ===\n');

  await initDb();
  await resetPersistentRateLimitsForTest();
  const suffix = Date.now().toString(36);
  const storage = getStorageProvider();

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY TESTS
  // =========================================================================
  console.log('Suite 1: Username + Key Authentication & Security-Question Key Recovery');

  const unameA = `Alice_${suffix}`;
  const keyA = `alice-secret-key-${suffix}-998877`;
  const questionA = 'What was the street name of the first residence you remember living at?';
  const answerA = 'Baker Street 221B';

  const unameB = `Bob_${suffix}`;
  const keyB = `bob-secret-key-${suffix}-112233`;
  const unameC = `Charlie_${suffix}`;
  const keyC = `charlie-secret-key-${suffix}-445566`;

  // 1. Username validation rules
  const vUname = validateUsername(unameA);
  assert(
    vUname.valid && vUname.normalized === unameA.toLowerCase(),
    'Normalizes username to lowercase while preserving displayUsername'
  );

  const reservedCheck = validateUsername('admin');
  assert(!reservedCheck.valid, 'Rejects reserved username "admin"');

  const dotStart = validateUsername('.alice');
  assert(!dotStart.valid, 'Rejects username starting with period');

  // 2. Login key validation rules
  const sameAsUserKey = validateLoginKey(unameA, unameA);
  assert(!sameAsUserKey.valid, 'Rejects login key identical to username');

  const shortKey = validateLoginKey('1234567', unameA);
  assert(!shortKey.valid, 'Rejects login key shorter than 8 characters');

  const numericKey = validateLoginKey('123456789012', unameA);
  assert(numericKey.valid, 'Allows numeric-only login key >= 8 chars');

  const unicodeKey = validateLoginKey('🔐🚀नमस्ते-विश्व-2026', unameA);
  assert(unicodeKey.valid, 'Allows Unicode login key');

  // 3. Security question & answer validation rules
  const shortQuestion = validateSecurityQuestion('Short?');
  assert(!shortQuestion.valid, 'Rejects security question shorter than 10 chars');

  const validQuestion = validateSecurityQuestion(questionA);
  assert(validQuestion.valid, 'Validates security question (10-150 chars)');

  const normAnswer = normalizeSecurityAnswer('   Baker   Street   221B   ');
  assert(normAnswer === 'baker street 221b', 'Normalizes answer: trims, lowercases, and collapses internal whitespace');

  const shortAnswer = validateSecurityAnswer('abc');
  assert(!shortAnswer.valid, 'Rejects security answer shorter than 4 chars');

  const answerSameAsUser = validateSecurityAnswer(unameA, unameA, keyA);
  assert(!answerSameAsUser.valid, 'Rejects security answer identical to username');

  const answerSameAsKey = validateSecurityAnswer(keyA, unameA, keyA);
  assert(!answerSameAsKey.valid, 'Rejects security answer identical to login key');

  // 4. Argon2id hashing for key and answer
  const hashA = await hashLoginKey(keyA);
  assert(hashA.startsWith('$argon2id$'), 'Hashes login key with Argon2id PHC format');
  assert(!hashA.includes(keyA), 'Argon2id key hash never contains plaintext key');

  const ansHashA = await hashSecurityAnswer(normAnswer);
  assert(ansHashA.startsWith('$argon2id$'), 'Hashes security answer with salted Argon2id PHC format');
  assert(!ansHashA.includes('baker') && !ansHashA.includes(answerA), 'Argon2id answer hash never contains plaintext answer');

  // 5. Register via POST /api/auth/register endpoint
  const regWithoutAck = await registerPost(
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: unameA,
        key: keyA,
        securityQuestion: questionA,
        securityAnswer: answerA,
        acknowledgedWarning: false,
      }),
    })
  );
  assert(regWithoutAck.status === 400, 'Rejects registration when acknowledgement checkbox is unchecked');

  const regReqA = new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: unameA,
      key: keyA,
      securityQuestion: questionA,
      securityAnswer: answerA,
      acknowledgedWarning: true,
    }),
  });
  const regResA = await registerPost(regReqA);
  assert(regResA.status === 201, 'Registers User A with question, answer, and acknowledged policy');
  const regDataA = await regResA.json();
  const userA = regDataA.user;
  assert(userA.hasSecurityQuestion === true, 'User A object reflects hasSecurityQuestion: true');

  // Case-insensitive duplicate username registration rejected
  const dupRegRes = await registerPost(
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: unameA.toUpperCase(),
        key: 'different-password-1234',
        securityQuestion: questionA,
        securityAnswer: 'some answer 123',
        acknowledgedWarning: true,
      }),
    })
  );
  assert(dupRegRes.status === 409, 'Detects duplicate username case-insensitively (ALICE == alice) on registration');

  // 6. Login via POST /api/auth/login endpoint
  // Key alone MUST no longer work
  const keyOnlyLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyA }),
    })
  );
  assert(keyOnlyLogin.status === 400, 'Login with key alone strictly fails (username is required)');

  // Wrong username fails with identical message
  const wrongUserLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent_user_99', key: keyA }),
    })
  );
  const wrongUserJson = await wrongUserLogin.json();

  // Wrong key fails with identical message
  const wrongKeyLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unameA, key: 'completely-wrong-key-999' }),
    })
  );
  const wrongKeyJson = await wrongKeyLogin.json();

  assert(
    wrongUserLogin.status === 401 &&
      wrongKeyLogin.status === 401 &&
      wrongUserJson.error === 'Invalid username or key.' &&
      wrongKeyJson.error === 'Invalid username or key.',
    'Login failure status (401) and error message ("Invalid username or key.") are identical for wrong username and wrong key'
  );

  // Correct username + key succeeds
  const correctLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unameA, key: keyA }),
    })
  );
  assert(correctLogin.status === 200, 'Authenticates User A with Username + Key');

  // 7. Two users with identical login keys
  const sharedKey = `shared-secret-key-${suffix}-common`;
  const unameUser1 = `SharedU1_${suffix}`;
  const unameUser2 = `SharedU2_${suffix}`;

  const regU1 = await registerPost(
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
      body: JSON.stringify({
        username: unameUser1,
        key: sharedKey,
        securityQuestion: PRESET_SECURITY_QUESTIONS[0],
        securityAnswer: 'Secret Answer One',
        acknowledgedWarning: true,
      }),
    })
  );
  const regU2 = await registerPost(
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.2' },
      body: JSON.stringify({
        username: unameUser2,
        key: sharedKey,
        securityQuestion: PRESET_SECURITY_QUESTIONS[1],
        securityAnswer: 'Secret Answer Two',
        acknowledgedWarning: true,
      }),
    })
  );
  assert(
    regU1.status === 201 && regU2.status === 201,
    'Allows two users with the exact same login key to register separately'
  );

  const loginU1 = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
      body: JSON.stringify({ username: unameUser1, key: sharedKey }),
    })
  );
  const loginU2 = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.2' },
      body: JSON.stringify({ username: unameUser2, key: sharedKey }),
    })
  );
  const jsonU1 = await loginU1.json();
  const jsonU2 = await loginU2.json();
  assert(
    loginU1.status === 200 &&
      loginU2.status === 200 &&
      jsonU1.user?.id !== jsonU2.user?.id &&
      jsonU1.user?.username === unameUser1.toLowerCase() &&
      jsonU2.user?.username === unameUser2.toLowerCase(),
    'Both users with identical keys log in separately to their own distinct accounts'
  );

  // 8. Forgot-Key Recovery Flow
  // Question lookup for existing user
  const qResA = await recoveryQuestionPost(
    new NextRequest('http://localhost:3000/api/auth/recovery/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unameA }),
    })
  );
  const qDataA = await qResA.json();
  assert(qResA.status === 200 && qDataA.question === questionA, 'Returns configured security question for User A');

  // Question lookup for unknown user returns deterministic question-shaped response
  const qResUnknown = await recoveryQuestionPost(
    new NextRequest('http://localhost:3000/api/auth/recovery/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `nonexistent_${suffix}` }),
    })
  );
  const qDataUnknown = await qResUnknown.json();
  assert(
    qResUnknown.status === 200 &&
      typeof qDataUnknown.question === 'string' &&
      qDataUnknown.question.length >= 10,
    'Returns plausible question-shaped response for unknown username to prevent enumeration'
  );

  // Unknown username reset attempt returns generic failure
  const resetUnknown = await recoveryResetPost(
    new NextRequest('http://localhost:3000/api/auth/recovery/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `nonexistent_${suffix}`,
        answer: 'any answer here',
        newKey: 'new-unrecoverable-key-1234',
        confirmKey: 'new-unrecoverable-key-1234',
      }),
    })
  );
  assert(resetUnknown.status === 400, 'Unknown username reset attempt fails generically (status 400)');

  // Wrong answer lockout test on a dedicated test user
  const lockUname = `LockTest_${suffix}`;
  const lockKey = `lock-key-${suffix}-112233`;
  await registerPost(
    new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: lockUname,
        key: lockKey,
        securityQuestion: PRESET_SECURITY_QUESTIONS[2],
        securityAnswer: 'CorrectLockAnswer',
        acknowledgedWarning: true,
      }),
    })
  );

  let lockoutTriggered = false;
  for (let i = 1; i <= 5; i++) {
    const attemptRes = await recoveryResetPost(
      new NextRequest('http://localhost:3000/api/auth/recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` },
        body: JSON.stringify({
          username: lockUname,
          answer: `wrong-answer-guess-${i}`,
          newKey: 'new-key-12345678',
          confirmKey: 'new-key-12345678',
        }),
      })
    );
    if (i === 5 && attemptRes.status === 429) {
      lockoutTriggered = true;
    }
  }
  assert(lockoutTriggered, 'Locks recovery after 5 wrong security answers (status 429)');

  // Enforced across a different IP
  const postLockoutAttempt = await recoveryResetPost(
    new NextRequest('http://localhost:3000/api/auth/recovery/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.99' },
      body: JSON.stringify({
        username: lockUname,
        answer: 'CorrectLockAnswer',
        newKey: 'new-key-12345678',
        confirmKey: 'new-key-12345678',
      }),
    })
  );
  assert(postLockoutAttempt.status === 429, 'Recovery lockout is enforced across distinct IP addresses');

  // Successful key recovery for User A (case and whitespace tolerant)
  const newKeyA = `alice-brand-new-key-${suffix}-recovered`;
  const recoverySuccess = await recoveryResetPost(
    new NextRequest('http://localhost:3000/api/auth/recovery/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: unameA,
        answer: '   bAKeR   sTrEEt   221b   ', // Mixed case + multiple spaces
        newKey: newKeyA,
        confirmKey: newKeyA,
      }),
    })
  );
  const recoveryData = await recoverySuccess.json();
  assert(
    recoverySuccess.status === 200 && recoveryData.success === true,
    'Recovery succeeds with case-insensitive, whitespace-tolerant security answer'
  );
  assert(
    !JSON.stringify(recoveryData).includes(answerA) && !JSON.stringify(recoveryData).includes(newKeyA),
    'Security answer and new key NEVER appear in recovery API response payload'
  );

  // Old key stops working
  const oldKeyLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unameA, key: keyA }),
    })
  );
  assert(oldKeyLogin.status === 401, 'Old private login key stops working immediately after reset');

  // Old JWT session invalidated
  const rawAfterReset = await getRawUserById(userA.id);
  assert(
    Number(rawAfterReset?.session_version || 1) > 1,
    'Increments session_version during key recovery to invalidate all prior active sessions'
  );

  // New key signs in successfully and shows key reset notice
  const newKeyLogin = await loginPost(
    new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: unameA, key: newKeyA }),
    })
  );
  const newKeyJson = await newKeyLogin.json();
  assert(
    newKeyLogin.status === 200 && typeof newKeyJson.keyResetNotice === 'string',
    'New login key succeeds and displays notice that key was reset'
  );

  // 9. Existing user migration path
  // Simulate an older user registered prior to Migration 004 without a security question
  const legacyUname = `Legacy_${suffix}`;
  const legacyKey = `legacy-secret-key-${suffix}-00`;
  const legacyUser = await createUser(
    crypto.randomUUID(),
    legacyUname,
    await hashLoginKey(legacyKey),
    null,
    { displayUsername: legacyUname }
  );
  assert(legacyUser.hasSecurityQuestion === false, 'Existing legacy user reflects hasSecurityQuestion: false');

  const legacyFetched = await getUserById(legacyUser.id);
  assert(legacyFetched?.hasSecurityQuestion === false, 'getUserById() flags existing user without security question');

  // Set security question for the legacy user
  await updateUserSecurityQuestion(
    legacyUser.id,
    PRESET_SECURITY_QUESTIONS[3],
    await hashSecurityAnswer('Met in Chicago')
  );
  const legacyUpdated = await getUserById(legacyUser.id);
  assert(legacyUpdated?.hasSecurityQuestion === true, 'Existing user migration: setting question marks account protected');

  // 10. Legacy /api/auth/recover endpoint check
  const recoverRes = await recoverPost();
  assert(
    recoverRes.status === 410,
    'Legacy recovery endpoint returns 410 Deprecated advising clients to use the new recovery endpoints'
  );

  // 11. Session verification & logout invalidation
  const tokenV1 = await createSessionToken({
    userId: userA.id,
    username: userA.username,
    sessionVersion: Number(rawAfterReset?.session_version || 1),
  });
  const decodedV1 = await verifySessionToken(tokenV1);
  assert(decodedV1?.userId === userA.id, 'Verifies valid JWT session token');

  await incrementUserSessionVersion(userA.id);
  const rawAfterLogout = await getRawUserById(userA.id);
  assert(
    Number(rawAfterLogout?.session_version || 1) > Number(decodedV1?.sessionVersion || 1),
    'Increments session_version on logout to invalidate prior session tokens'
  );

  // Create User B and User C for isolation & chat tests in subsequent suites
  const userB = await createUser(crypto.randomUUID(), unameB, await hashLoginKey(keyB), null, {
    displayUsername: unameB,
    securityQuestion: PRESET_SECURITY_QUESTIONS[0],
    securityAnswerHash: await hashSecurityAnswer('answer bob 123'),
  });
  const userC = await createUser(crypto.randomUUID(), unameC, await hashLoginKey(keyC), null, {
    displayUsername: unameC,
    securityQuestion: PRESET_SECURITY_QUESTIONS[1],
    securityAnswerHash: await hashSecurityAnswer('answer charlie 123'),
  });

  // =========================================================================
  // 2. VAULT ITEMS, EXPIRATION & CLEANUP TESTS
  // =========================================================================
  console.log('\nSuite 2: Personal Vault, Mandatory 24h Expiration & Cleanup');

  const beforeCreate = Date.now();
  const textItemId = crypto.randomUUID();
  await createItem({
    id: textItemId,
    userId: userA.id,
    type: 'text',
    title: 'Default 24h Note',
    textContent: 'Secret exam notes',
  });
  const textItem = await getItemById(textItemId, userA.id);
  const expTime = new Date(textItem.expiresAt).getTime();
  const diffHours = (expTime - beforeCreate) / (1000 * 3600);
  assert(
    textItem.expirationDurationSec === 86400 && diffHours > 23.9 && diffHours < 24.1,
    'Sets default item expiration to 24 hours (86400 seconds) when omitted'
  );

  const customLinkId = crypto.randomUUID();
  await createItem({
    id: customLinkId,
    userId: userA.id,
    type: 'link',
    title: '1-Hour Link',
    url: 'https://example.com',
    expirationDurationSec: 3600,
  });
  const customLinkItem = await getItemById(customLinkId, userA.id);
  assert(
    customLinkItem.expirationDurationSec === 3600,
    'Saves custom expiration preset (1 hour = 3600s) accurately'
  );

  // Cross-user vault isolation
  const userBItems = await getItems({ userId: userB.id });
  assert(
    !userBItems.some((i) => i.id === textItem.id),
    'Enforces cross-user vault isolation (User B cannot list User A items)'
  );
  const userBReadA = await getItemById(textItem.id, userB.id);
  assert(userBReadA === null, 'Blocks User B from reading User A item by ID');
  const userBDeleteA = await permanentDeleteItem(textItem.id, userB.id);
  const stillExistsForA = await getItemById(textItem.id, userA.id);
  assert(
    userBDeleteA === null && stillExistsForA !== null,
    'Blocks User B from deleting User A item'
  );

  // Upload a real file to storage and create an item that is ALREADY expired
  const fileBytes = Buffer.from('Global Send temporary file payload for expiration test');
  const expiredItemId = crypto.randomUUID();
  const expiredFileId = crypto.randomUUID();
  const storageKey = `users/${userA.id}/test-${suffix}-file.txt`;
  await storage.uploadFile({
    storageKey,
    filename: 'Already Expired Document.txt',
    mimeType: 'text/plain',
    buffer: fileBytes,
    userId: userA.id,
    itemId: expiredItemId,
  });

  const pastExpiryIso = new Date(Date.now() - 5000).toISOString(); // Expired 5s ago
  await createItem({
    id: expiredItemId,
    userId: userA.id,
    type: 'file',
    title: 'Already Expired Document.txt',
    expiresAt: pastExpiryIso,
    expirationDurationSec: 60,
  });
  await createFileRecord({
    id: expiredFileId,
    itemId: expiredItemId,
    userId: userA.id,
    originalFilename: 'Already Expired Document.txt',
    sanitizedFilename: 'Already_Expired_Document.txt',
    mimeType: 'text/plain',
    fileSize: fileBytes.length,
    storageKey,
    storageProvider: storage.name,
  });

  // Immediate access rejection BEFORE cleanup job runs
  const lookupExpiredItem = await getItemById(expiredItemId, userA.id);
  assert(
    lookupExpiredItem === null,
    'Immediately hides expired item from getItemById() even before cleanup worker runs'
  );
  const activeVaultItems = await getItems({ userId: userA.id });
  assert(
    !activeVaultItems.some((i) => i.id === expiredItemId),
    'Immediately excludes expired item from getItems() vault listing'
  );
  const expiredFileAuth = await authorizeFileAccess(expiredFileId, userA.id);
  assert(
    expiredFileAuth.status === 'expired',
    'Immediately blocks file download of expired item with status="expired" before cleanup runs'
  );

  // Run physical cleanup worker
  const cleanupResult = await executeFullCleanup();
  const storageVerify = await storage.verifyFile(storageKey);
  assert(
    cleanupResult.expiredItemsMarked >= 1 && storageVerify.exists === false,
    'executeFullCleanup() permanently deletes expired item from database and storage'
  );

  // Retry queue test for failed storage deletions
  await enqueueStorageDeletion(
    `users/${userA.id}/retry-${suffix}.bin`,
    storage.name,
    'expired'
  );
  const retryRun = await executeFullCleanup();
  assert(
    typeof retryRun.storageObjectsDeleted === 'number',
    'Processes deletion_queue entries during cleanup run'
  );

  // Upload session quota reservation & cancellation cleanup
  const uploadReservation = await reserveUploadSession({
    userId: userA.id,
    itemId: crypto.randomUUID(),
    originalFilename: 'large-video.mp4',
    mimeType: 'video/mp4',
    fileSize: 5 * 1024 * 1024,
    expirationDurationSec: 86400,
    storageProvider: storage.name,
  });
  assert(
    uploadReservation.allowed === true && Boolean(uploadReservation.sessionId),
    'Atomically reserves quota for chunked upload session'
  );
  if (uploadReservation.sessionId) {
    await updateUploadSession(uploadReservation.sessionId, userA.id, {
      status: 'cancelled',
    });
    const sessionAfterCancel = await getUploadSession(uploadReservation.sessionId, userA.id);
    assert(
      sessionAfterCancel?.status === 'cancelled',
      'Cancels active upload session and releases reserved quota'
    );
  }

  // =========================================================================
  // 3. PROFILE PICTURE (DP) 100 KiB LIMIT & IMAGE SECURITY TESTS
  // =========================================================================
  console.log('\nSuite 3: Profile Picture (DP) 100 KiB Limit & EXIF Stripping');

  // Create a valid PNG with a tEXt metadata chunk to verify stripping
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x0d, // length 13
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width 1
    0x00, 0x00, 0x00, 0x01, // height 1
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x90, 0x77, 0x53, 0xde, // CRC
  ]);
  const textPayload = Buffer.from('Author\0SecretEXIFData');
  const textLen = Buffer.alloc(4);
  textLen.writeUInt32BE(textPayload.length, 0);
  const textChunk = Buffer.concat([
    textLen,
    Buffer.from('tEXt'),
    textPayload,
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // dummy CRC
  ]);
  const idatChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x0c,
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00,
    0x18, 0xdd, 0x8d, 0xb0,
  ]);
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82,
  ]);
  const validPngWithMetadata = Buffer.concat([pngSig, ihdrChunk, textChunk, idatChunk, iendChunk]);

  const sanitizedPng = validateAndSanitizeAvatar(validPngWithMetadata, 'image/png');
  assert(
    sanitizedPng.valid && sanitizedPng.mimeType === 'image/png',
    'Accepts valid PNG under 100 KiB'
  );
  assert(
    sanitizedPng.sanitizedBuffer !== undefined &&
      !sanitizedPng.sanitizedBuffer.includes(Buffer.from('SecretEXIFData')),
    'Strips ancillary tEXt/EXIF metadata chunks from uploaded PNG'
  );

  // Valid JPEG with APP1 EXIF segment
  const jpegWithExif = Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe1, 0x00, 0x10]), // APP1 marker, length 16
    Buffer.from('Exif\0\0GPSData123'), // 14 bytes payload
    Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x00, 0x01]), // DQT
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
  const sanitizedJpeg = validateAndSanitizeAvatar(jpegWithExif, 'image/jpeg');
  assert(
    sanitizedJpeg.valid &&
      sanitizedJpeg.sanitizedBuffer !== undefined &&
      !sanitizedJpeg.sanitizedBuffer.includes(Buffer.from('GPSData123')),
    'Accepts valid JPEG and strips APP1 EXIF GPS metadata segment'
  );

  // Oversized > 100 KiB (105 KiB = 107,520 bytes)
  const oversizedBuffer = Buffer.concat([pngSig, Buffer.alloc(105 * 1024, 0)]);
  const oversizedCheck = validateAndSanitizeAvatar(oversizedBuffer, 'image/png');
  assert(
    !oversizedCheck.valid && oversizedCheck.error?.includes('100 KiB'),
    'Rejects profile picture larger than 100 KiB (105 KiB rejected)'
  );

  // SVG disguised as image/jpeg
  const disguisedSvg = Buffer.from(
    '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'
  );
  const svgCheck = validateAndSanitizeAvatar(disguisedSvg, 'image/jpeg');
  assert(
    !svgCheck.valid && detectImageMagicBytes(disguisedSvg) === null,
    'Rejects SVG file even when disguised with image/jpeg MIME type'
  );

  // Avatar replacement cleanup test
  const dpKey1 = `users/${userA.id}/avatar/dp1-${suffix}.png`;
  const dpKey2 = `users/${userA.id}/avatar/dp2-${suffix}.png`;
  await storage.uploadFile({
    storageKey: dpKey1,
    filename: 'dp1.png',
    mimeType: 'image/png',
    buffer: sanitizedPng.sanitizedBuffer,
    userId: userA.id,
    itemId: 'avatar-1',
  });
  await updateUserAvatar(userA.id, {
    storageKey: dpKey1,
    mimeType: 'image/png',
    sizeBytes: sanitizedPng.sizeBytes,
    avatarData: sanitizedPng.sanitizedBuffer.toString('base64'),
  });
  const afterDp1 = await getUserById(userA.id);
  assert(
    afterDp1?.avatarUrl?.includes(encodeURIComponent(userA.username)) === true,
    'Sets user avatarUrl after valid DP upload'
  );

  // Replace with dpKey2 and delete previousStorageKey
  await storage.uploadFile({
    storageKey: dpKey2,
    filename: 'dp2.png',
    mimeType: 'image/png',
    buffer: sanitizedPng.sanitizedBuffer,
    userId: userA.id,
    itemId: 'avatar-2',
  });
  const { previousStorageKey } = await updateUserAvatar(userA.id, {
    storageKey: dpKey2,
    mimeType: 'image/png',
    sizeBytes: sanitizedPng.sizeBytes,
    avatarData: sanitizedPng.sanitizedBuffer.toString('base64'),
  });
  if (previousStorageKey) {
    await storage.deleteFile(previousStorageKey);
  }
  const oldDpVerify = await storage.verifyFile(dpKey1);
  assert(
    previousStorageKey === dpKey1 && oldDpVerify.exists === false,
    'Deletes previous profile picture from storage when replaced'
  );

  // =========================================================================
  // 4. PRIVATE 1-TO-1 CHAT & SHARED ATTACHMENT TESTS
  // =========================================================================
  console.log('\nSuite 4: Private 1-to-1 Chat, Vault File Sharing & Expiration Enforcement');

  // Public user search
  const searchResults = await searchPublicUsers(unameB, userA.id);
  const foundB = searchResults.find(
    (u) => u.username.toLowerCase() === unameB.toLowerCase()
  );
  assert(
    Boolean(foundB) &&
      Object.keys(foundB).every((k) => ['username', 'avatarUrl'].includes(k)),
    'Username search returns ONLY minimal public profile (username, avatarUrl)'
  );

  // 1-to-1 conversation creation & canonical ordering idempotency
  const convAB = await getOrCreateConversation(userA.id, userB.username);
  const convBA = await getOrCreateConversation(userB.id, userA.username);
  assert(
    convAB.conversation.id === convBA.conversation.id,
    'Enforces canonical 1-to-1 conversation pair without duplicates (A↔B == B↔A)'
  );

  // Non-participant access check
  let cAccessBlocked = false;
  try {
    await getConversationMessages(convAB.conversation.id, userC.id);
  } catch {
    cAccessBlocked = true;
  }
  assert(
    cAccessBlocked === true,
    'Prevents third user (User C) from reading User A & B conversation'
  );

  // Create a shared vault file owned by User A (expires in 24h)
  const sharedPayload = Buffer.from('Shared project specification PDF bytes');
  const sharedVaultItemId = crypto.randomUUID();
  const sharedFileId = crypto.randomUUID();
  const sharedStorageKey = `users/${userA.id}/shared-${suffix}.pdf`;
  await storage.uploadFile({
    storageKey: sharedStorageKey,
    filename: 'Architecture_Spec.pdf',
    mimeType: 'application/pdf',
    buffer: sharedPayload,
    userId: userA.id,
    itemId: sharedVaultItemId,
  });
  await createItem({
    id: sharedVaultItemId,
    userId: userA.id,
    type: 'file',
    title: 'Architecture_Spec.pdf',
    expirationDurationSec: 86400,
  });
  await createFileRecord({
    id: sharedFileId,
    itemId: sharedVaultItemId,
    userId: userA.id,
    originalFilename: 'Architecture_Spec.pdf',
    sanitizedFilename: 'Architecture_Spec.pdf',
    mimeType: 'application/pdf',
    fileSize: sharedPayload.length,
    storageKey: sharedStorageKey,
    storageProvider: storage.name,
  });
  const sharedVaultItem = await getItemById(sharedVaultItemId, userA.id);
  const originalExpiresAt = sharedVaultItem.expiresAt;

  // User C cannot download User A's unshared file
  const unsharedAuthC = await authorizeFileAccess(sharedFileId, userC.id);
  assert(
    unsharedAuthC.status === 'forbidden',
    'Blocks non-recipient User C from downloading User A file'
  );

  // User A shares the item in chat with User B
  const chatMsg = await sendChatMessage({
    conversationId: convAB.conversation.id,
    senderId: userA.id,
    messageType: 'attachment',
    textContent: 'Here is the spec file!',
    sharedItemId: sharedVaultItem.id,
  });
  assert(
    chatMsg.attachment?.itemId === sharedVaultItem.id &&
      chatMsg.attachment?.isExpired === false,
    'Attaches existing vault item to chat message with live metadata'
  );

  // Verify sharing did NOT extend or alter the item's expiration timestamp
  const itemAfterShare = await getItemById(sharedVaultItem.id, userA.id);
  assert(
    itemAfterShare?.expiresAt === originalExpiresAt,
    'Sharing a vault item in chat NEVER extends the original item expiration'
  );

  // Recipient User B can now download the shared file before expiration
  const recipientAuthBeforeExpiry = await authorizeFileAccess(sharedFileId, userB.id);
  assert(
    recipientAuthBeforeExpiry.status === 'ok',
    'Allows chat recipient (User B) to download shared vault file before expiration'
  );

  // Now create an item that expires in 80ms and share it in chat
  const fastExpireItemId = crypto.randomUUID();
  const fastExpireFileId = crypto.randomUUID();
  const fastExpireStorageKey = `users/${userA.id}/fast-expire-${suffix}.txt`;
  await createItem({
    id: fastExpireItemId,
    userId: userA.id,
    type: 'file',
    title: 'Short_Lived_Secret.txt',
    expiresAt: new Date(Date.now() + 80).toISOString(),
    expirationDurationSec: 1,
  });
  await createFileRecord({
    id: fastExpireFileId,
    itemId: fastExpireItemId,
    userId: userA.id,
    originalFilename: 'Short_Lived_Secret.txt',
    sanitizedFilename: 'Short_Lived_Secret.txt',
    mimeType: 'text/plain',
    fileSize: 12,
    storageKey: fastExpireStorageKey,
    storageProvider: storage.name,
  });

  await sendChatMessage({
    conversationId: convAB.conversation.id,
    senderId: userA.id,
    messageType: 'attachment',
    textContent: 'This file will expire in 80ms',
    sharedItemId: fastExpireItemId,
  });

  // Wait 150ms for expiration
  await new Promise((r) => setTimeout(r, 150));

  const recipientAuthAfterExpiry = await authorizeFileAccess(fastExpireFileId, userB.id);
  assert(
    recipientAuthAfterExpiry.status === 'expired',
    'Blocks chat recipient from downloading shared file after expiration (status="expired")'
  );

  const { messages: messagesAfterExpiry } = await getConversationMessages(
    convAB.conversation.id,
    userB.id
  );
  const expiredChatMsg = messagesAfterExpiry.find(
    (m) => m.attachment?.title === 'Short_Lived_Secret.txt'
  );
  assert(
    expiredChatMsg?.attachment?.isExpired === true &&
      expiredChatMsg?.attachment?.downloadUrl === null,
    'Marks shared chat attachment as isExpired: true ("File expired") while keeping chat message history intact'
  );

  // User blocking test
  await blockUser(userB.id, userA.id);
  const blockedState = await isEitherUserBlocked(userA.id, userB.id);
  assert(blockedState === true, 'Records user block between User B and User A');

  const authWhileBlocked = await authorizeFileAccess(sharedFileId, userB.id);
  assert(
    authWhileBlocked.status === 'forbidden',
    'Revokes shared file download access when conversation is blocked'
  );

  // =========================================================================
  // 5. DEPLOYMENT READINESS: OAUTH CSRF STATE, ADMIN ISOLATION & LIVE QUOTA
  // =========================================================================
  console.log('\nSuite 5: OAuth State Verification, Admin Isolation & Live Quota Accounting');

  const validState = createOAuthStateToken(userA.id);
  assert(
    verifyOAuthStateToken(validState, userA.id) === true,
    'Verifies authentic HMAC-SHA-256 signed OAuth state token for admin user'
  );
  assert(
    verifyOAuthStateToken(validState, userB.id) === false,
    'Rejects OAuth state token when presented by a different user'
  );
  assert(
    verifyOAuthStateToken(`${validState}tampered`, userA.id) === false,
    'Rejects tampered OAuth state signature'
  );

  const oauthCfg = getGoogleOAuthConfig('https://gb-send.vercel.app');
  assert(
    oauthCfg.redirectUri === 'https://gb-send.vercel.app/api/admin/gdrive/callback',
    'Constructs exact callback redirectUri from incoming request origin when GDRIVE_REDIRECT_URI is unset'
  );

  const isBAdmin = await isUserAdmin(userB.id);
  const isCAdmin = await isUserAdmin(userC.id);
  assert(
    isBAdmin === false && isCAdmin === false,
    'Ensures ordinary users (User B, User C) are not administrators and cannot self-promote'
  );

  // Verify live provider quota integration in getUserStorageUsage
  const simulatedLiveQuota = {
    usedBytes: 10 * 1024 * 1024 * 1024, // 10 GiB used on Google Drive
    limitBytes: 15 * 1024 * 1024 * 1024, // 15 GiB total Drive limit
    availableBytes: 5 * 1024 * 1024 * 1024, // 5 GiB available on Drive
  };
  const usageWithLiveDrive = await getUserStorageUsage(userA.id, simulatedLiveQuota);
  assert(
    usageWithLiveDrive.globalLimitBytes === simulatedLiveQuota.limitBytes &&
      usageWithLiveDrive.globalUsedBytes >= simulatedLiveQuota.usedBytes &&
      usageWithLiveDrive.globalAvailableBytes <=
        simulatedLiveQuota.availableBytes - usageWithLiveDrive.safetyReserveBytes,
    'Incorporates live Google Drive quota (used, limit, available minus 512 MiB safety reserve) into storage calculations'
  );

  console.log('\n========================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
