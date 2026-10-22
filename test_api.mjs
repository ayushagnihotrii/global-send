const BASE = 'http://localhost:3005';

async function runTests() {
  console.log('--- QuickVault End-to-End Automated Acceptance Tests ---');

  // Test 1: Register User 1
  const username1 = 'teststudent_' + Math.floor(Math.random() * 10000);
  const password = 'Password123!';
  console.log(`\n1. Testing Registration for @${username1}...`);
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username1, password }),
  });
  const regData = await regRes.json();
  console.log('Register status:', regRes.status, 'Response:', regData);
  if (!regRes.ok || !regData.recoveryCode) {
    throw new Error('Registration failed: ' + JSON.stringify(regData));
  }
  const cookie1 = regRes.headers.get('set-cookie');
  console.log('User 1 registered with Recovery Code:', regData.recoveryCode);

  // Test 2: Check Session
  console.log('\n2. Testing /api/auth/me session check...');
  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: cookie1 },
  });
  const meData = await meRes.json();
  console.log('Auth me status:', meRes.status, 'Data:', meData);
  if (!meData.authenticated || meData.user.username !== username1) {
    throw new Error('Auth check failed');
  }

  // Test 3: Phone-to-Computer Text Workflow (Save complex programming question)
  console.log('\n3. Testing Saving Long Multiline Programming Question...');
  const longQuestionText = `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Constraints:
2 <= nums.length <= 104
-109 <= nums[i] <= 109
Only one valid answer exists.

Follow-up: Can you come up with an algorithm that is less than O(n2) time complexity?`;

  const itemRes = await fetch(`${BASE}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({
      type: 'text',
      title: 'LeetCode 1: Two Sum Problem',
      textContent: longQuestionText,
      tags: ['DSA', 'Arrays', 'InterviewPrep'],
    }),
  });
  const itemData = await itemRes.json();
  console.log('Saved Item Status:', itemRes.status, 'Item ID:', itemData.item?.id);
  if (!itemRes.ok || !itemData.item?.id) {
    throw new Error('Failed to save text item');
  }
  const questionId = itemData.item.id;

  // Test 4: Save Link
  console.log('\n4. Testing Saving Website Link...');
  const linkRes = await fetch(`${BASE}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({
      type: 'link',
      title: 'Python Official Documentation',
      url: 'https://docs.python.org/3/',
      note: 'Reference for standard library data structures',
      tags: ['Python', 'Docs'],
    }),
  });
  const linkData = await linkRes.json();
  console.log('Saved Link Status:', linkRes.status, 'Title:', linkData.item?.title);

  // Test 5: Verify Date-grouped Items Retrieval
  console.log('\n5. Testing Retrieving Locker Items...');
  const getRes = await fetch(`${BASE}/api/items`, {
    headers: { Cookie: cookie1 },
  });
  const getData = await getRes.json();
  console.log('Total items in locker:', getData.items?.length);
  if (getData.items?.length !== 2) {
    throw new Error('Expected 2 items, got ' + getData.items?.length);
  }

  // Test 6: Search
  console.log('\n6. Testing Full Search for "Two Sum" and tag "DSA"...');
  const searchRes = await fetch(`${BASE}/api/items?search=algorithm`, {
    headers: { Cookie: cookie1 },
  });
  const searchData = await searchRes.json();
  console.log('Search matches for "algorithm" in body:', searchData.items?.length);
  if (searchData.items?.length !== 1 || searchData.items[0].id !== questionId) {
    throw new Error('Search failed to find text containing word inside question body');
  }

  // Test 7: Toggle Favourite
  console.log('\n7. Testing Toggle Favourite...');
  const favRes = await fetch(`${BASE}/api/items/${questionId}/favourite`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
  });
  const favData = await favRes.json();
  console.log('Favourite status:', favData.isFavourite);

  // Test 8: Security & User Data Isolation
  console.log('\n8. Testing Data Isolation with User 2...');
  const username2 = 'attacker_' + Math.floor(Math.random() * 10000);
  const regRes2 = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username2, password }),
  });
  const cookie2 = regRes2.headers.get('set-cookie');

  // Attempt to access User 1's question with User 2's session
  const breachRes = await fetch(`${BASE}/api/items/${questionId}`, {
    headers: { Cookie: cookie2 },
  });
  console.log('Attacker access status (should be 404/Forbidden):', breachRes.status);
  if (breachRes.status !== 404) {
    throw new Error('SECURITY VIOLATION: User 2 accessed User 1 item!');
  }
  console.log('Security verified! Unauthorized access rejected with 404.');

  // Test 9: File Upload via Local/R2 flow
  console.log('\n9. Testing File Upload Flow...');
  const uploadInitRes = await fetch(`${BASE}/api/storage/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({
      filename: 'sample_solution.py',
      mimeType: 'text/x-python',
      fileSize: 128,
    }),
  });
  const uploadInitData = await uploadInitRes.json();
  console.log('Upload Init Mode:', uploadInitData.mode, 'Upload URL:', uploadInitData.uploadUrl);

  // Upload file content
  const formData = new FormData();
  const fileBlob = new Blob(['def twoSum(nums, target):\n    lookup = {}\n    for i, n in enumerate(nums):\n        if target - n in lookup:\n            return [lookup[target - n], i]\n        lookup[n] = i\n'], { type: 'text/x-python' });
  formData.append('file', fileBlob, 'sample_solution.py');
  formData.append('storageKey', uploadInitData.storageKey);

  const uploadRes = await fetch(`${BASE}${uploadInitData.uploadUrl}`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
    body: formData,
  });
  console.log('Local Upload Response Status:', uploadRes.status);

  // Confirm upload
  const confirmRes = await fetch(`${BASE}/api/storage/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie1,
    },
    body: JSON.stringify({
      itemId: uploadInitData.itemId,
      storageKey: uploadInitData.storageKey,
      originalFilename: 'sample_solution.py',
      mimeType: 'text/x-python',
      fileSize: 128,
      title: 'Python Solution for Two Sum',
      tags: ['Code', 'Python'],
    }),
  });
  const confirmData = await confirmRes.json();
  console.log('Confirm Upload Status:', confirmRes.status, 'Title:', confirmData.item?.title);
  if (!confirmRes.ok || !confirmData.item) {
    throw new Error('Confirm upload failed');
  }

  // Test 10: Storage Usage check
  console.log('\n10. Testing Storage Usage calculation...');
  const storageRes = await fetch(`${BASE}/api/user/storage`, {
    headers: { Cookie: cookie1 },
  });
  const storageData = await storageRes.json();
  console.log('Storage Usage:', storageData.usage);

  // Test 11: Trash & Restore workflow
  console.log('\n11. Testing Soft Delete & Trash...');
  const delRes = await fetch(`${BASE}/api/items/${questionId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie1 },
  });
  console.log('Soft Delete Status:', delRes.status);

  const trashRes = await fetch(`${BASE}/api/items?inTrash=true`, {
    headers: { Cookie: cookie1 },
  });
  const trashData = await trashRes.json();
  console.log('Items in Trash:', trashData.items?.length);
  if (trashData.items?.length !== 1) {
    throw new Error('Expected 1 item in trash');
  }

  // Restore
  console.log('\n12. Testing Restore from Trash...');
  const restoreRes = await fetch(`${BASE}/api/items/${questionId}/restore`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
  });
  console.log('Restore Status:', restoreRes.status);

  const activeRes = await fetch(`${BASE}/api/items`, {
    headers: { Cookie: cookie1 },
  });
  const activeData = await activeRes.json();
  console.log('Active Items after restore:', activeData.items?.length);
  if (activeData.items?.length !== 3) {
    throw new Error('Expected 3 active items after restore');
  }

  console.log('\n========================================');
  console.log('ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================\n');
}

runTests().catch((e) => {
  console.error('\nTEST FAILED:', e);
  process.exit(1);
});
