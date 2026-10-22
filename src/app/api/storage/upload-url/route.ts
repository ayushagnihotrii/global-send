import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getUserStorageUsage } from '@/lib/db';
import { SITE_CONFIG } from '@/config/site';
import { isR2Configured, generateStorageKey, createPresignedUploadUrl } from '@/lib/r2';
import { getStorageConfig, ConfigurationError } from '@/lib/env-config';

const uploadUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.number().positive('File size must be greater than 0'),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = uploadUrlSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { filename, mimeType, fileSize } = result.data;

    // Check individual file size limit
    if (fileSize > SITE_CONFIG.maxUploadSizeBytes) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed upload size of ${SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)} MB.` },
        { status: 400 }
      );
    }

    // Check overall user quota
    const usage = await getUserStorageUsage(session.userId);
    if (usage.usedBytes + fileSize > usage.limitBytes) {
      return NextResponse.json(
        { error: 'Storage quota exceeded. Please delete some files or empty trash to free up space.' },
        { status: 403 }
      );
    }

    const itemId = crypto.randomUUID();
    const storageKey = generateStorageKey(session.userId, itemId, filename);
    const storageConfig = getStorageConfig();

    if (storageConfig.storage.driver === 'google_drive') {
      return NextResponse.json({
        success: true,
        mode: 'gdrive',
        uploadUrl: '/api/storage/upload',
        storageKey: `gdrive://${itemId}`,
        itemId,
      });
    } else if (storageConfig.storage.driver === 'r2' && isR2Configured()) {
      const uploadUrl = await createPresignedUploadUrl(storageKey, mimeType, 900);
      return NextResponse.json({
        success: true,
        mode: 'r2',
        uploadUrl,
        storageKey,
        itemId,
      });
    } else {
      // Local fallback mode for zero-config development/test only
      return NextResponse.json({
        success: true,
        mode: 'local',
        uploadUrl: '/api/storage/upload',
        storageKey,
        itemId,
      });
    }
  } catch (err: any) {
    if (err instanceof ConfigurationError) {
      console.error('[QuickVault Configuration Error]:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error('Upload URL request error:', err);
    return NextResponse.json({ error: 'Failed to initiate file upload' }, { status: 500 });
  }
}
