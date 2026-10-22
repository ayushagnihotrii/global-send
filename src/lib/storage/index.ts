/**
 * Global Send: Storage Provider Factory & Unified Operations
 */

import { StorageProvider } from './types';
export type { StorageProvider, StorageProviderType } from './types';
import { LocalStorageProvider } from './local-provider';
import { CloudflareR2StorageProvider } from './r2-provider';
import { GoogleDriveStorageProvider } from './google-drive-provider';
import { getStorageConfig } from '@/lib/env-config';

let cachedProvider: StorageProvider | null = null;

/**
 * Returns the currently configured StorageProvider instance.
 */
export function getStorageProvider(): StorageProvider {
  if (cachedProvider && process.env.NODE_ENV !== 'test') {
    return cachedProvider;
  }

  const config = getStorageConfig();

  if (config.storage.driver === 'google_drive') {
    cachedProvider = new GoogleDriveStorageProvider();
  } else if (config.storage.driver === 'r2' && config.storage.r2) {
    cachedProvider = new CloudflareR2StorageProvider(config.storage.r2);
  } else {
    cachedProvider = new LocalStorageProvider(config.storage.localDir);
  }

  return cachedProvider;
}

/**
 * Smart deletion helper: deletes the file using the appropriate provider based on the storage key format.
 * - Keys starting with 'gdrive://' -> GoogleDriveStorageProvider
 * - Keys matching S3/local -> active provider
 */
export async function deleteStorageFile(storageKey: string): Promise<boolean> {
  if (storageKey.startsWith('gdrive://')) {
    const driveProvider = new GoogleDriveStorageProvider();
    return driveProvider.deleteFile(storageKey);
  }

  const provider = getStorageProvider();
  return provider.deleteFile(storageKey);
}

export * from './types';
export * from './local-provider';
export * from './r2-provider';
export * from './google-drive-provider';
export * from './google-drive-auth';
