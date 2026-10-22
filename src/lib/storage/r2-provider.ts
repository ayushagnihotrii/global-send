/**
 * Global Send: Cloudflare R2 Storage Provider
 * Implements S3-compatible object storage via AWS SDK.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
  StorageDownloadResult,
  StorageQuotaInfo,
} from './types';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export class CloudflareR2StorageProvider implements StorageProvider {
  readonly name = 'r2' as const;
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: params.storageKey,
      Body: params.buffer,
      ContentType: params.mimeType,
    });

    await this.client.send(command);

    return {
      storageKey: params.storageKey,
      provider: 'r2',
      size: params.buffer.length,
    };
  }

  async getDownloadStream(storageKey: string, range?: { start: number; end?: number }): Promise<StorageDownloadResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Range: range ? `bytes=${range.start}-${range.end !== undefined ? range.end : ''}` : undefined,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Failed to stream object from R2: ${storageKey}`);
    }

    return {
      stream: response.Body as any,
      mimeType: response.ContentType || 'application/octet-stream',
      size: response.ContentLength,
      statusCode: range ? 206 : 200,
    };
  }

  async getDownloadUrl(storageKey: string, filename: string, asAttachment = false): Promise<string> {
    const disposition = asAttachment
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ResponseContentDisposition: disposition,
    });

    return getSignedUrl(this.client, command, { expiresIn: 1800 }); // 30 minutes
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.error('CloudflareR2StorageProvider.deleteFile error:', err);
      return false;
    }
  }

  async verifyFile(storageKey: string): Promise<{ exists: boolean; size: number }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      const head = await this.client.send(command);
      return {
        exists: true,
        size: head.ContentLength || 0,
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false, size: 0 };
      }
      throw err;
    }
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    return {
      provider: 'r2',
      usedBytes: 0,
      note: 'Cloudflare R2 Object Storage (10 GB free tier included)',
    };
  }
}
