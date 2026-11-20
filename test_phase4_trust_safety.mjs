import assert from 'node:assert/strict';
import {
  initDb,
  createReport,
  getReportById,
  listReports,
  updateReportStatus,
  query,
} from './src/lib/db.ts';
import { checkRateLimit } from './src/lib/rate-limit.ts';

async function runTests() {
  console.log('🧪 Starting Phase 4 Trust & Safety, Abuse Reporting & Rate Limiting Test Suite...');
  await initDb();

  // 1. Create abuse report for a share link
  console.log('1. Testing abuse report creation with IP masking...');
  const report1 = await createReport({
    targetType: 'share',
    targetId: 'share_xyz123',
    reason: 'copyright',
    details: 'Unauthorized distribution of copyrighted video file.',
    reporterEmail: 'creator@example.com',
    reporterIp: '198.51.100.42',
  });

  assert.ok(report1.id, 'Report ID should be generated');
  assert.equal(report1.targetType, 'share');
  assert.equal(report1.targetId, 'share_xyz123');
  assert.equal(report1.reason, 'copyright');
  assert.equal(report1.reporterEmail, 'creator@example.com');
  assert.equal(report1.reporterIpMasked, '198.51.100.xxx');
  assert.equal(report1.status, 'pending');
  console.log('  ✓ Abuse report created with privacy-preserving IP masking');

  // 2. Retrieve report by ID
  console.log('2. Testing report lookup by ID...');
  const fetched = await getReportById(report1.id);
  assert.ok(fetched);
  assert.equal(fetched.id, report1.id);
  assert.equal(fetched.details, 'Unauthorized distribution of copyrighted video file.');
  console.log('  ✓ Report fetched successfully');

  // 3. Create second report and test list & filter
  console.log('3. Testing report listing and status filtering...');
  const report2 = await createReport({
    targetType: 'file',
    targetId: 'file_malware999',
    reason: 'malware',
    details: 'Trojan downloader masquerading as PDF invoice.',
    reporterIp: '2001:db8::1', // IPv6
  });
  assert.equal(report2.reporterIpMasked, 'masked-ip');

  const pendingList = await listReports({ status: 'pending' });
  assert.ok(pendingList.length >= 2);
  const found1 = pendingList.some((r) => r.id === report1.id);
  const found2 = pendingList.some((r) => r.id === report2.id);
  assert.ok(found1 && found2, 'Both pending reports must appear in list');
  console.log('  ✓ Listing and status filtering work accurately');

  // 4. Update report status
  console.log('4. Testing report lifecycle status updates...');
  await updateReportStatus(report1.id, 'reviewed');
  const reviewed = await getReportById(report1.id);
  assert.equal(reviewed.status, 'reviewed');

  await updateReportStatus(report1.id, 'resolved');
  const resolved = await getReportById(report1.id);
  assert.equal(resolved.status, 'resolved');
  console.log('  ✓ Report lifecycle transitions successfully (pending -> reviewed -> resolved)');

  // 5. Test Rate Limiting
  console.log('5. Testing sliding-window rate limiter...');
  const mockIp = `test_client_${Date.now()}`;
  const mockReq = {
    headers: new Headers({ 'x-forwarded-for': mockIp }),
  };

  // Allow up to 3 requests in window
  const r1 = checkRateLimit(mockReq, { maxRequests: 3, windowMs: 10000, prefix: 'test_limit' });
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(mockReq, { maxRequests: 3, windowMs: 10000, prefix: 'test_limit' });
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(mockReq, { maxRequests: 3, windowMs: 10000, prefix: 'test_limit' });
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // 4th request must be blocked
  const r4 = checkRateLimit(mockReq, { maxRequests: 3, windowMs: 10000, prefix: 'test_limit' });
  assert.equal(r4.allowed, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.resetSeconds > 0);

  // A different IP must still be allowed
  const mockOtherReq = {
    headers: new Headers({ 'x-forwarded-for': `different_client_${Date.now()}` }),
  };
  const rOther = checkRateLimit(mockOtherReq, { maxRequests: 3, windowMs: 10000, prefix: 'test_limit' });
  assert.equal(rOther.allowed, true);
  console.log('  ✓ Rate limiter enforces max requests, blocks abusive clients, and isolates per IP');

  console.log('\n🎉 ALL PHASE 4 TRUST & SAFETY TESTS PASSED (5/5)!');
}

runTests().catch((err) => {
  console.error('❌ Phase 4 Test Suite Failed:', err);
  process.exit(1);
});
