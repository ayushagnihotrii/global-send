/**
 * Global Send: Pluggable Storage Provider Interface & Types
 */

import { Readable } from 'stream';

export type StorageProviderType = 'google_drive' | 'r2' | 'local';

export interface StorageUploadParams {
  storageKey: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  userId: string;
  itemId: string;
}

export interface StorageUploadResult {
  storageKey: string;
  provider: StorageProviderType;
  size: number;
  fileId?: string;
}

export interface StorageDownloadResult {
  stream: ReadableStream | NodeJS.ReadableStream | Readable;
  mimeType: string;
  size?: number;
  filename?: string;
  contentRange?: string;
  statusCode?: number;
}

export interface StorageQuotaInfo {
  provider: StorageProviderType;
  usedBytes: number;
  limitBytes?: number;
  availableBytes?: number;
  accountEmail?: string;
  note?: string;
}

export interface StorageProvider {
  readonly name: StorageProviderType;
  
  /**
   * Uploads a file buffer directly to the storage provider
   */
  uploadFile(params: StorageUploadParams): Promise<StorageUploadResult>;
  
  /**
   * Streams a file from the storage provider, supporting optional HTTP range queries
   */
  getDownloadStream(storageKey: string, range?: { start: number; end?: number }): Promise<StorageDownloadResult>;
  
  /**
   * Generates a direct URL if supported (e.g. presigned S3 URL)
   */
  getDownloadUrl?(storageKey: string, filename: string, asAttachment?: boolean): Promise<string>;
  
  /**
   * Deletes a file permanently from storage
   */
  deleteFile(storageKey: string): Promise<boolean>;
  
  /**
   * Verifies that a file exists and retrieves its byte size
   */
  verifyFile(storageKey: string): Promise<{ exists: boolean; size: number }>;
  
  /**
   * Retrieves account storage quota if supported
   */
  getQuota?(): Promise<StorageQuotaInfo>;
}
