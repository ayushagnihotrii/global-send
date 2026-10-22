/**
 * Global Send: Google Drive Storage Provider
 * Implements cloud file persistence directly into the user's personal Google Drive account.
 */

import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
  StorageDownloadResult,
  StorageQuotaInfo,
} from './types';
import { getValidAccessToken, getOrCreateGlobalSendFolder } from './google-drive-auth';

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export class GoogleDriveStorageProvider implements StorageProvider {
  readonly name = 'google_drive' as const;

  /**
   * Helper to extract the Drive file ID from storage key formats:
   * "gdrive://<fileId>" or plain "<fileId>"
   */
  private extractFileId(storageKey: string): string {
    if (storageKey.startsWith('gdrive://')) {
      return storageKey.replace('gdrive://', '').split('/')[0];
    }
    return storageKey;
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    const accessToken = await getValidAccessToken();
    const folderId = await getOrCreateGlobalSendFolder(accessToken);

    const metadata = {
      name: params.filename,
      mimeType: params.mimeType,
      parents: [folderId],
      description: `Uploaded by Global Send (Item: ${params.itemId}, User: ${params.userId})`,
      appProperties: {
        globalSendUserId: params.userId,
        globalSendItemId: params.itemId,
      },
    };

    const boundary = `-------GlobalSendBoundary${crypto.randomUUID()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataHeader =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${params.mimeType}\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(metadataHeader, 'utf8'),
      params.buffer,
      Buffer.from(closeDelimiter, 'utf8'),
    ]);

    const res = await fetch(`${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,size`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length.toString(),
      },
      body: bodyBuffer,
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error(`Google Drive upload failed: ${data.error?.message || 'Unknown error'}`);
    }

    const storageKey = `gdrive://${data.id}`;

    return {
      storageKey,
      fileId: data.id,
      provider: 'google_drive',
      size: Number(data.size || params.buffer.length),
    };
  }

  async getDownloadStream(storageKey: string, range?: { start: number; end?: number }): Promise<StorageDownloadResult> {
    const fileId = this.extractFileId(storageKey);
    const accessToken = await getValidAccessToken();

    // 1. Fetch file metadata
    const metaRes = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        throw new Error(`File not found in Google Drive: ${storageKey}`);
      }
      const errData = await metaRes.json().catch(() => ({}));
      throw new Error(`Failed to get Google Drive file metadata: ${errData.error?.message || metaRes.statusText}`);
    }

    const metadata = await metaRes.json();
    const totalSize = metadata.size ? Number(metadata.size) : undefined;
    const mimeType = metadata.mimeType || 'application/octet-stream';
    const filename = metadata.name || 'file';

    // 2. Fetch binary media content (supporting range)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (range && range.start !== undefined) {
      headers['Range'] = `bytes=${range.start}-${range.end !== undefined ? range.end : ''}`;
    }

    const mediaRes = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`, {
      headers,
    });

    if (!mediaRes.ok && mediaRes.status !== 206) {
      throw new Error(`Failed to stream file from Google Drive: status ${mediaRes.status}`);
    }

    if (!mediaRes.body) {
      throw new Error('Google Drive returned an empty response body');
    }

    return {
      stream: mediaRes.body as any,
      mimeType,
      size: totalSize,
      filename,
      statusCode: mediaRes.status,
      contentRange: mediaRes.headers.get('content-range') || undefined,
    };
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const fileId = this.extractFileId(storageKey);
      const accessToken = await getValidAccessToken();

      const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 204 No Content is success, 404 means already gone
      return res.status === 204 || res.status === 404;
    } catch (err) {
      console.error('GoogleDriveStorageProvider.deleteFile error:', err);
      return false;
    }
  }

  async verifyFile(storageKey: string): Promise<{ exists: boolean; size: number }> {
    try {
      const fileId = this.extractFileId(storageKey);
      const accessToken = await getValidAccessToken();

      const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,name,size,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        return { exists: false, size: 0 };
      }

      const data = await res.json();
      if (data.trashed) {
        return { exists: false, size: 0 };
      }

      return {
        exists: true,
        size: Number(data.size || 0),
      };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    try {
      const accessToken = await getValidAccessToken();
      const res = await fetch(`${GOOGLE_DRIVE_API}/about?fields=storageQuota,user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Quota request failed with status ${res.status}`);
      }

      const data = await res.json();
      const quota = data.storageQuota || {};
      const user = data.user || {};

      const limitBytes = quota.limit ? Number(quota.limit) : 15 * 1024 * 1024 * 1024;
      const usedBytes = quota.usage ? Number(quota.usage) : 0;
      const availableBytes = limitBytes - usedBytes;

      return {
        provider: 'google_drive',
        usedBytes,
        limitBytes,
        availableBytes,
        accountEmail: user.emailAddress,
        note: `Google Drive storage shared across Gmail, Photos, and Drive. Available: ${Math.round(availableBytes / (1024 * 1024 * 1024) * 10) / 10} GB of ${Math.round(limitBytes / (1024 * 1024 * 1024))} GB`,
      };
    } catch (err: any) {
      return {
        provider: 'google_drive',
        usedBytes: 0,
        note: `Google Drive quota check error: ${err.message}`,
      };
    }
  }
}
