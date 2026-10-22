/**
 * Global Send: Local Disk Storage Provider
 * Default zero-config provider for development and testing environments.
 */

import fs from 'fs';
import path from 'path';
import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
  StorageDownloadResult,
  StorageQuotaInfo,
} from './types';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;
  private readonly baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.join(process.cwd(), '.data', 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(storageKey: string): string {
    // Prevent directory traversal
    const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '');
    return path.join(this.baseDir, safeKey);
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    const targetPath = this.resolvePath(params.storageKey);
    const parentDir = path.dirname(targetPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, params.buffer);
    const stat = await fs.promises.stat(targetPath);

    return {
      storageKey: params.storageKey,
      provider: 'local',
      size: stat.size,
    };
  }

  async getDownloadStream(storageKey: string, range?: { start: number; end?: number }): Promise<StorageDownloadResult> {
    const filePath = this.resolvePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${storageKey}`);
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;

    // Detect MIME type
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.txt') mimeType = 'text/plain';
    else if (ext === '.json') mimeType = 'application/json';

    if (range && range.start !== undefined) {
      const start = range.start;
      const end = range.end !== undefined ? range.end : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      return {
        stream,
        mimeType,
        size: chunkSize,
        contentRange: `bytes ${start}-${end}/${fileSize}`,
        statusCode: 206,
        filename: path.basename(filePath),
      };
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      mimeType,
      size: fileSize,
      statusCode: 200,
      filename: path.basename(filePath),
    };
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const filePath = this.resolvePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch (err) {
      console.error('LocalStorageProvider.deleteFile error:', err);
      return false;
    }
  }

  async verifyFile(storageKey: string): Promise<{ exists: boolean; size: number }> {
    try {
      const filePath = this.resolvePath(storageKey);
      if (!fs.existsSync(filePath)) {
        return { exists: false, size: 0 };
      }
      const stat = await fs.promises.stat(filePath);
      return { exists: true, size: stat.size };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    return {
      provider: 'local',
      usedBytes: 0,
      limitBytes: 2 * 1024 * 1024 * 1024, // 2 GB virtual limit
      note: 'Local development storage on disk (.data/uploads)',
    };
  }
}
