/**
 * Global Send: Expiration & Physical Storage Cleanup Service
 * Coordinates marking expired items inaccessible, aborting abandoned upload sessions,
 * and permanently deleting expired/orphaned files from Google Drive (or active storage)
 * with automatic exponential-backoff retries.
 */

import { runExpirationCleanup } from './db';
import { deleteStorageFile, getStorageProvider } from './storage';

let lastOpportunisticCleanupMs = 0;
let isCleanupRunning = false;

export async function executeFullCleanup(): Promise<{
  expiredItemsMarked: number;
  abandonedSessionsCleaned: number;
  storageObjectsDeleted: number;
  storageDeletionsFailed: number;
}> {
  if (isCleanupRunning) {
    return {
      expiredItemsMarked: 0,
      abandonedSessionsCleaned: 0,
      storageObjectsDeleted: 0,
      storageDeletionsFailed: 0,
    };
  }

  isCleanupRunning = true;
  try {
    const provider = getStorageProvider();
    return await runExpirationCleanup({
      deleteStorageObject: async (storageKey: string) => {
        return deleteStorageFile(storageKey);
      },
      abortUploadSession: async (sessionUrl: string) => {
        if (provider.abortResumableUpload) {
          return provider.abortResumableUpload(sessionUrl);
        }
        return true;
      },
    });
  } finally {
    isCleanupRunning = false;
    lastOpportunisticCleanupMs = Date.now();
  }
}

/**
 * Triggers a non-blocking background cleanup pass at most once every 60 seconds
 * so expired items are physically removed promptly even between scheduled cron runs.
 */
export function triggerOpportunisticCleanup(minIntervalMs = 60000): void {
  const now = Date.now();
  if (now - lastOpportunisticCleanupMs < minIntervalMs || isCleanupRunning) {
    return;
  }
  lastOpportunisticCleanupMs = now;
  executeFullCleanup().catch((err) => {
    console.warn('[Global Send Cleanup Warning]:', err?.message || 'Cleanup error');
  });
}
