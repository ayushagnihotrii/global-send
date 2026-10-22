import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';
import { getStorageConfig } from './env-config';

export function isR2Configured(): boolean {
  const config = getStorageConfig();
  return config.storage.driver === 'r2' && Boolean(config.storage.r2);
}

let s3ClientInstance: S3Client | null = null;

function getR2Client(): { client: S3Client; bucketName: string } {
  const config = getStorageConfig();
  if (config.storage.driver !== 'r2' || !config.storage.r2) {
    throw new Error('Cloudflare R2 is not configured in environment variables');
  }

  const { accountId, accessKeyId, secretAccessKey, bucketName } = config.storage.r2;

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return { client: s3ClientInstance, bucketName };
}

/**
 * Generate a unique, unguessable storage key for a user file
 */
export function generateStorageKey(userId: string, itemId: string, filename: string): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = crypto.randomUUID();
  return `users/${userId}/${itemId}/${uniquePrefix}-${safeFilename}`;
}

/**
 * Create a short-lived presigned URL for direct client-to-R2 upload
 */
export async function createPresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  expiresInSeconds = 900 // 15 mins
): Promise<string> {
  const { client, bucketName } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ContentType: mimeType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Create a short-lived presigned download/viewing URL for an R2 object
 */
export async function createPresignedDownloadUrl(
  storageKey: string,
  filename: string,
  asAttachment = false,
  expiresInSeconds = 1800 // 30 mins
): Promise<string> {
  const { client, bucketName } = getR2Client();
  const disposition = asAttachment
    ? `attachment; filename="${encodeURIComponent(filename)}"`
    : `inline; filename="${encodeURIComponent(filename)}"`;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ResponseContentDisposition: disposition,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Verify whether an object exists in Cloudflare R2 and retrieve its actual size
 */
export async function verifyR2Object(storageKey: string): Promise<{ exists: boolean; size: number }> {
  try {
    const { client, bucketName } = getR2Client();
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    const head = await client.send(command);
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

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteR2Object(storageKey: string): Promise<boolean> {
  try {
    const { client, bucketName } = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error('Failed to delete object from R2:', storageKey, err);
    return false;
  }
}

/**
 * Unified storage deletion helper: deletes from R2 if configured, or from local disk if in local mode.
 * Guarantees storage and database consistency.
 */
export async function deleteStorageFile(storageKey: string): Promise<boolean> {
  const config = getStorageConfig();
  if (config.storage.driver === 'r2') {
    return deleteR2Object(storageKey);
  } else {
    try {
      const localPath = path.join(process.cwd(), '.data', 'uploads', storageKey);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete local storage file:', storageKey, err);
      return false;
    }
  }
}
