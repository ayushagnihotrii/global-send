/**
 * Global Send Phase 2 Verification Suite
 * Tests Vault Folders, Hierarchical Partitioning, Item Movement,
 * Permanent Retention (expires_at = null), 30-Day Trash Lifecycle, and Storage Quotas.
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  initDb,
  createUser,
  createItem,
  getItemById,
  getItems,
  createFolder,
  getFolders,
  getFolderPath,
  moveItemToFolder,
  softDeleteItem,
  restoreItem,
  permanentDeleteItem,
  emptyTrash,
  runExpirationCleanup,
  getUserStorageUsage,
  createFileRecord,
} from './src/lib/db.ts';

async function runPhase2Tests() {
  console.log('\n=== GLOBAL SEND PHASE 2: FOLDERS, QUOTAS & TRASH SUITE ===\n');
  await initDb();

  const testUserId = crypto.randomUUID();
  const testUsername = `testuser_${Date.now()}`;
  await createUser(testUserId, testUsername, 'dummy_hash_for_testing');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Suite 1: Vault Folders Hierarchy & Navigation
  // --------------------------------------------------------------------------
  console.log('Suite 1: Vault Folders & Breadcrumbs');

  let folderA;
  let folderB;
  let subfolderA1;

  await test('Creates root folders with is_folder=true and is_permanent=true', async () => {
    folderA = await createFolder({
      userId: testUserId,
      name: 'Work Projects',
      parentFolderId: null,
    });
    folderB = await createFolder({
      userId: testUserId,
      name: 'Personal Photos',
      parentFolderId: null,
    });

    assert.strictEqual(folderA.title, 'Work Projects');
    assert.strictEqual(folderA.isFolder, true);
    assert.strictEqual(folderA.isPermanent, true);
    assert.strictEqual(folderA.expiresAt, null);
    assert.strictEqual(folderA.parentFolderId, null);

    const rootFolders = await getFolders(testUserId, 'root');
    const rootTitles = rootFolders.map((f) => f.title);
    assert.ok(rootTitles.includes('Work Projects'));
    assert.ok(rootTitles.includes('Personal Photos'));
  });

  await test('Creates nested subfolder inside parent folder', async () => {
    subfolderA1 = await createFolder({
      userId: testUserId,
      name: '2026 Commercials',
      parentFolderId: folderA.id,
    });

    assert.strictEqual(subfolderA1.title, '2026 Commercials');
    assert.strictEqual(subfolderA1.parentFolderId, folderA.id);

    const subfoldersOfA = await getFolders(testUserId, folderA.id);
    assert.strictEqual(subfoldersOfA.length, 1);
    assert.strictEqual(subfoldersOfA[0].title, '2026 Commercials');

    // Root folder query must NOT include the subfolder
    const rootFolders = await getFolders(testUserId, 'root');
    assert.ok(!rootFolders.some((f) => f.id === subfolderA1.id));
  });

  await test('Resolves breadcrumb path from nested folder back to root', async () => {
    const path = await getFolderPath(subfolderA1.id, testUserId);
    assert.strictEqual(path.length, 2);
    assert.strictEqual(path[0].id, folderA.id);
    assert.strictEqual(path[0].name, 'Work Projects');
    assert.strictEqual(path[1].id, subfolderA1.id);
    assert.strictEqual(path[1].name, '2026 Commercials');
  });

  // --------------------------------------------------------------------------
  // Suite 2: Item Organization & Move Functionality
  // --------------------------------------------------------------------------
  console.log('\nSuite 2: Item Folder Partitioning & Movement');

  const rootItemId = crypto.randomUUID();
  const folderItemId = crypto.randomUUID();

  await test('Partitions items by parent folder', async () => {
    // 1. Create item in Vault root
    await createItem({
      id: rootItemId,
      userId: testUserId,
      type: 'text',
      title: 'Root Quick Note',
      textContent: 'Important root ideas',
      parentFolderId: null,
      isPermanent: true,
    });

    // 2. Create item inside subfolder
    await createItem({
      id: folderItemId,
      userId: testUserId,
      type: 'text',
      title: 'Commercial Shot List',
      textContent: 'Scene 1: Drone shot over mountains',
      parentFolderId: subfolderA1.id,
      isPermanent: true,
    });

    // Query root items
    const rootItems = await getItems({ userId: testUserId, parentFolderId: 'root' });
    assert.ok(rootItems.some((i) => i.id === rootItemId));
    assert.ok(!rootItems.some((i) => i.id === folderItemId));

    // Query folder items
    const folderItems = await getItems({ userId: testUserId, parentFolderId: subfolderA1.id });
    assert.ok(folderItems.some((i) => i.id === folderItemId));
    assert.ok(!folderItems.some((i) => i.id === rootItemId));
  });

  await test('Global search finds items across all folders transparently', async () => {
    const searchResults = await getItems({ userId: testUserId, search: 'drone shot' });
    assert.ok(searchResults.some((i) => i.id === folderItemId));
  });

  await test('Moves an item between folders and back to root', async () => {
    // Move root item into folderB
    await moveItemToFolder(rootItemId, testUserId, folderB.id);
    let item = await getItemById(rootItemId, testUserId);
    assert.strictEqual(item.parentFolderId, folderB.id);

    // Verify it now appears in folderB
    const folderBItems = await getItems({ userId: testUserId, parentFolderId: folderB.id });
    assert.ok(folderBItems.some((i) => i.id === rootItemId));

    // Move item back to root (null)
    await moveItemToFolder(rootItemId, testUserId, null);
    item = await getItemById(rootItemId, testUserId);
    assert.strictEqual(item.parentFolderId, null);
  });

  await test('Rejects moving a folder into itself', async () => {
    await assert.rejects(
      async () => {
        await moveItemToFolder(folderA.id, testUserId, folderA.id);
      },
      /Cannot move a folder into itself/
    );
  });

  // --------------------------------------------------------------------------
  // Suite 3: Permanent Retention Vault Items
  // --------------------------------------------------------------------------
  console.log('\nSuite 3: Permanent Retention Vault Items');

  const permItemId = crypto.randomUUID();

  await test('Permanent items have expiresAt=null and isPermanent=true', async () => {
    await createItem({
      id: permItemId,
      userId: testUserId,
      type: 'text',
      title: 'Permanent Archive File',
      textContent: 'This must never expire automatically',
      expirationDurationSec: 0,
    });

    const item = await getItemById(permItemId, testUserId);
    assert.strictEqual(item.isPermanent, true);
    assert.strictEqual(item.expiresAt, null);
    assert.strictEqual(item.isExpired, false);
  });

  await test('runExpirationCleanup never expires or deletes permanent vault items', async () => {
    const res = await runExpirationCleanup({
      deleteStorageObject: async () => true,
    });

    const item = await getItemById(permItemId, testUserId);
    assert.ok(item !== null);
    assert.strictEqual(item.deletionStatus, 'active');
  });

  // --------------------------------------------------------------------------
  // Suite 4: 30-Day Trash Lifecycle & Auto-Purge
  // --------------------------------------------------------------------------
  console.log('\nSuite 4: 30-Day Trash Lifecycle & Auto-Purge');

  const trashItemId = crypto.randomUUID();

  await test('Soft-deleting an item sets deletedAt and purgeAt (+30 days)', async () => {
    await createItem({
      id: trashItemId,
      userId: testUserId,
      type: 'text',
      title: 'Item to Trash',
      textContent: 'Temporary text',
      isPermanent: true,
    });

    await softDeleteItem(trashItemId, testUserId);
    const item = await getItemById(trashItemId, testUserId, { includeExpired: true });

    assert.ok(item.deletedAt !== null);
    assert.ok(item.purgeAt !== null);
    assert.strictEqual(item.deletionStatus, 'deleted');

    // Confirm purgeAt is ~30 days in the future
    const purgeMs = new Date(item.purgeAt).getTime();
    const diffDays = Math.round((purgeMs - Date.now()) / (24 * 3600 * 1000));
    assert.strictEqual(diffDays, 30);
  });

  await test('Restoring an item clears deletedAt and purgeAt', async () => {
    await restoreItem(trashItemId, testUserId);
    const item = await getItemById(trashItemId, testUserId);

    assert.strictEqual(item.deletedAt, null);
    assert.strictEqual(item.purgeAt, null);
    assert.strictEqual(item.deletionStatus, 'active');
  });

  await test('Soft-deleting a folder cascades to items inside that folder', async () => {
    await softDeleteItem(subfolderA1.id, testUserId);

    const folder = await getItemById(subfolderA1.id, testUserId, { includeExpired: true });
    const childItem = await getItemById(folderItemId, testUserId, { includeExpired: true });

    assert.ok(folder.deletedAt !== null);
    assert.ok(childItem.deletedAt !== null);
    assert.strictEqual(childItem.deletionStatus, 'deleted');

    // Cascade restore
    await restoreItem(subfolderA1.id, testUserId);
    const restoredChild = await getItemById(folderItemId, testUserId);
    assert.strictEqual(restoredChild.deletedAt, null);
    assert.strictEqual(restoredChild.deletionStatus, 'active');
  });

  await test('runExpirationCleanup automatically purges items in trash past 30 days', async () => {
    const pastPurgeItemId = crypto.randomUUID();
    await createItem({
      id: pastPurgeItemId,
      userId: testUserId,
      type: 'text',
      title: 'Old Trashed Item',
      textContent: 'Past 30 days',
      isPermanent: true,
    });

    await softDeleteItem(pastPurgeItemId, testUserId);

    // Manually backdate purge_at to simulate 31 days elapsed
    const pastIso = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
    await import('./src/lib/db.ts').then((db) =>
      db.execute(`UPDATE items SET purge_at = $1 WHERE id = $2`, [pastIso, pastPurgeItemId])
    );

    const cleanupRes = await runExpirationCleanup({
      deleteStorageObject: async () => true,
    });

    // Item must be physically deleted from items table
    const check = await getItemById(pastPurgeItemId, testUserId, { includeExpired: true });
    assert.strictEqual(check, null);
  });

  // --------------------------------------------------------------------------
  // Suite 5: Storage Quota & Accounting
  // --------------------------------------------------------------------------
  console.log('\nSuite 5: Storage Quota & Breakdown Accounting');

  await test('Calculates storage usage and excludes trashed items from active quota', async () => {
    const fileItemId = crypto.randomUUID();
    const testFileSize = 25 * 1024 * 1024; // 25 MiB

    await createItem({
      id: fileItemId,
      userId: testUserId,
      type: 'file',
      title: 'Quota Test File.pdf',
      isPermanent: true,
    });

    await createFileRecord({
      id: crypto.randomUUID(),
      itemId: fileItemId,
      userId: testUserId,
      storageKey: `test://${crypto.randomUUID()}`,
      originalFilename: 'Quota Test File.pdf',
      mimeType: 'application/pdf',
      fileSize: testFileSize,
      uploadStatus: 'completed',
    });

    const usageBefore = await getUserStorageUsage(testUserId);
    assert.ok(usageBefore.usedBytes >= testFileSize);
    assert.ok(usageBefore.limitBytes >= 15 * 1024 * 1024 * 1024); // At least 15 GiB limit

    // Soft delete file -> active quota must immediately drop
    await softDeleteItem(fileItemId, testUserId);
    const usageAfter = await getUserStorageUsage(testUserId);
    assert.ok(usageAfter.usedBytes < usageBefore.usedBytes);
  });

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test suite uncaught exception:', err);
  process.exit(1);
});
