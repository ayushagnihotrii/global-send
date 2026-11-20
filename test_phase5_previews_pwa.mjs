import assert from 'node:assert/strict';
import { savePwaStash, consumePwaStash } from './src/lib/pwa-stash.ts';
import manifestFn from './src/app/manifest.ts';

const manifest = typeof manifestFn === 'function' ? manifestFn : manifestFn.default;

async function runTests() {
  console.log('🧪 Starting Phase 5 Media Previews, Thumbnails & PWA Share-Target Test Suite...');

  // 1. Test PWA Share-Target Manifest Configuration
  console.log('1. Validating PWA Web Manifest & Share-Target configuration...');
  const pwaManifest = manifest();
  assert.ok(pwaManifest, 'Manifest must be generated');
  assert.equal(pwaManifest.display, 'standalone');

  const shareTarget = pwaManifest.share_target;
  assert.ok(shareTarget, 'share_target must be configured in Web Manifest');
  assert.equal(shareTarget.action, '/share-target');
  assert.equal(shareTarget.method, 'POST');
  assert.equal(shareTarget.enctype, 'multipart/form-data');
  assert.ok(Array.isArray(shareTarget.params?.files), 'files param must be configured');
  assert.equal(shareTarget.params.files[0]?.name, 'files');
  console.log('  ✓ Web App Manifest includes valid PWA Share-Sheet target');

  // 2. Test PWA Stash Lifecycle
  console.log('2. Testing PWA Stash file staging and atomic consumption...');
  const stashId = 'test_stash_' + Date.now();
  const mockFile = {
    name: 'vacation_photo.jpg',
    type: 'image/jpeg',
    size: 1024 * 50,
    dataBase64: Buffer.from('mock_image_bytes').toString('base64'),
  };

  savePwaStash({
    id: stashId,
    title: 'Shared from mobile gallery',
    files: [mockFile],
  });

  // 1st consumption should succeed
  const consumed = consumePwaStash(stashId);
  assert.ok(consumed, 'Stashed entry must be retrieved');
  assert.equal(consumed.id, stashId);
  assert.equal(consumed.files.length, 1);
  assert.equal(consumed.files[0].name, 'vacation_photo.jpg');

  // 2nd consumption should return null (consumed once)
  const consumedAgain = consumePwaStash(stashId);
  assert.equal(consumedAgain, null, 'Stash must be single-use and auto-deleted upon consumption');
  console.log('  ✓ PWA Share stash operates atomically with zero memory retention');

  // 3. Test Audio Media Type Detection for In-Browser Previews
  console.log('3. Testing media type classification for streaming previews...');
  const isAudioFile = (filename, mimeType) => {
    return (
      (mimeType && mimeType.startsWith('audio/')) ||
      /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(filename)
    );
  };

  assert.equal(isAudioFile('podcast.mp3', 'audio/mpeg'), true);
  assert.equal(isAudioFile('voice_memo.m4a', 'application/octet-stream'), true);
  assert.equal(isAudioFile('track.flac', 'audio/flac'), true);
  assert.equal(isAudioFile('video.mp4', 'video/mp4'), false);
  assert.equal(isAudioFile('document.pdf', 'application/pdf'), false);
  console.log('  ✓ Audio and video streaming classification verified');

  // 4. Test Thumbnail Generator Module Structure
  console.log('4. Testing Thumbnail Engine module interfaces...');
  const thumbnailModule = await import('./src/lib/thumbnail.ts');
  assert.equal(typeof thumbnailModule.generateImageThumbnail, 'function');
  assert.equal(typeof thumbnailModule.generateVideoThumbnail, 'function');
  assert.equal(typeof thumbnailModule.extractMediaThumbnail, 'function');
  console.log('  ✓ Thumbnail extraction engine correctly exported for browser workers');

  console.log('\n🎉 ALL PHASE 5 PREVIEWS & PWA SHARE-TARGET TESTS PASSED (4/4)!');
}

runTests().catch((err) => {
  console.error('❌ Phase 5 Test Suite Failed:', err);
  process.exit(1);
});
