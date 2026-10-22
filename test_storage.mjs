// test_storage.mjs - End-to-end test for storage endpoints & token authentication

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

async function runStorageTests() {
  console.log(`\n=== Running Global Send Storage & API Verification on ${BASE_URL} ===\n`);
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200, `Health check returned 200 (db: ${health.database?.engine}, storage: ${health.storage?.provider})`);

    // 2. Register mobile user & get Bearer token
    const testUsername = `mobile_tester_${Date.now()}`;
    const testPassword = 'Password123!';
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 200 || regRes.status === 201, 'Mobile user registration succeeded');
    assert(!!regData.token, 'Mobile user registration returned Bearer token');
    const token = regData.token;

    // 3. Test Bearer token access on /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user?.username === testUsername, 'Bearer token authentication works for /api/auth/me');

    // 4. Test uploading a file via /api/storage/upload (multipart/form-data)
    const fileContent = 'Hello Global Send! This is a test file for the unified storage engine.\nSecond line with formatting preserved.';
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'text/plain' });
    formData.append('file', blob, 'sample_document.txt');
    formData.append('title', 'Sample Mobile Document');

    const uploadRes = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert((uploadRes.status === 200 || uploadRes.status === 201) && uploadData.item?.id, `File uploaded successfully (ID: ${uploadData.item?.id})`);
    const itemId = uploadData.item?.id;

    // 5. Test streaming download via /api/storage/file/[id]
    const downloadRes = await fetch(`${BASE_URL}/api/storage/file/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    assert(downloadRes.status === 200, 'File download via /api/storage/file/[id] returned 200');
    const downloadedText = await downloadRes.text();
    assert(downloadedText === fileContent, 'Downloaded file content matches uploaded content exactly');

    // 6. Test Range request (HTTP 206) for media streaming
    const rangeRes = await fetch(`${BASE_URL}/api/storage/file/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Range': 'bytes=0-15',
      },
    });
    assert(rangeRes.status === 206, `HTTP Range request returned 206 Partial Content (status: ${rangeRes.status})`);
    const partialText = await rangeRes.text();
    assert(partialText === fileContent.slice(0, 16), `Partial content matches expected slice ("${partialText}")`);

    // 7. Test privacy: Unauthenticated access must fail
    const unauthRes = await fetch(`${BASE_URL}/api/storage/file/${itemId}`);
    assert(unauthRes.status === 401, 'Unauthenticated download is rejected with 401');

    // 8. Test privacy: Another user cannot download the file
    const otherUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `intruder_${Date.now()}`, password: 'Password123!' }),
    });
    const otherData = await otherUserRes.json();
    const otherToken = otherData.token;

    const forbiddenRes = await fetch(`${BASE_URL}/api/storage/file/${itemId}`, {
      headers: { 'Authorization': `Bearer ${otherToken}` },
    });
    assert(forbiddenRes.status === 404 || forbiddenRes.status === 403, `Different user is denied access (status: ${forbiddenRes.status})`);

    // 9. Test Google Drive admin status endpoint
    const gdriveStatusRes = await fetch(`${BASE_URL}/api/admin/gdrive/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const gdriveStatus = await gdriveStatusRes.json();
    assert(gdriveStatusRes.status === 200, `Google Drive status check returned 200 (connected: ${gdriveStatus.connected})`);

    // 10. Test deleting the file
    const deleteRes = await fetch(`${BASE_URL}/api/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    assert(deleteRes.status === 200, 'File deletion via /api/items/[id] returned 200');

    // 11. Verify file is gone
    const checkRes = await fetch(`${BASE_URL}/api/storage/file/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    assert(checkRes.status === 404, 'Deleted file returns 404 on subsequent download attempt');

    // 12. Test AES-256-GCM Token Encryption & Decryption at rest
    const { encryptToken, decryptToken } = await import('./src/lib/crypto.ts');
    const secretRefreshToken = '1//04test_google_oauth_refresh_token_very_secret_xyz123';
    const encrypted = encryptToken(secretRefreshToken);
    assert(encrypted.startsWith('enc:v1:'), 'Token encrypted with AES-256-GCM prefix');
    assert(encrypted !== secretRefreshToken, 'Encrypted token differs completely from plaintext');
    assert(!encrypted.includes('test_google_oauth'), 'Ciphertext does not leak plaintext substrings');
    const decrypted = decryptToken(encrypted);
    assert(decrypted === secretRefreshToken, 'AES-256-GCM decrypted token matches original plaintext exactly');

    console.log(`\n=== Storage Tests Completed: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }

  if (failed > 0) process.exit(1);
}

runStorageTests();
