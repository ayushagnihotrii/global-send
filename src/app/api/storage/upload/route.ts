import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  reserveUploadSession,
  updateUploadSession,
  createItem,
  createFileRecord,
  syncItemTags,
  getItemById,
  validateExpirationDuration,
  sanitizeFilenameForDisplay,
} from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let reservedSessionId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawStorageKey = formData.get('storageKey') as string | null;
    let rawItemId = (formData.get('itemId') as string)?.trim();
    if (!rawItemId && rawStorageKey) {
      const parts = rawStorageKey.split('/');
      if (parts.length >= 3 && parts[0] === 'users' && parts[1] === session.userId) {
        rawItemId = parts[2];
      }
    }
    if (!rawItemId) {
      rawItemId = crypto.randomUUID();
    }

    const customTitle = (formData.get('title') as string)?.trim();
    const rawTags = formData.get('tags');
    const rawExpiration =
      formData.get('expirationSeconds') ?? formData.get('expirationDurationSec');

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form-data' }, { status: 400 });
    }

    // 1. Validate requested expiration duration on server (default: 24 hours = 86400s)
    const parsedExp =
      rawExpiration !== null && rawExpiration !== '' ? Number(rawExpiration) : undefined;
    const expValidation = validateExpirationDuration(parsedExp);
    if (!expValidation.valid) {
      return NextResponse.json(
        { error: expValidation.error || 'Invalid expiration duration' },
        { status: 400 }
      );
    }

    const fileSize = file.size;
    const filename = file.name || 'unnamed_file';
    const sanitizedFilename = sanitizeFilenameForDisplay(filename);
    const mimeType = file.type || 'application/octet-stream';

    // 2. Check live Google Drive quota if active provider is google_drive
    const provider = getStorageProvider();
    let liveDriveAvailableBytes: number | undefined;
    if (provider.name === 'google_drive' && provider.getQuota) {
      const quota = await provider.getQuota();
      if (typeof quota.availableBytes === 'number') {
        liveDriveAvailableBytes = quota.availableBytes;
      }
    }

    // 3. Atomically validate per-file, per-user, and global storage limits & reserve bytes
    const reservation = await reserveUploadSession({
      userId: session.userId,
      itemId: rawItemId,
      title: customTitle || sanitizedFilename,
      originalFilename: filename,
      mimeType,
      fileSize,
      expirationDurationSec: expValidation.durationSec,
      storageProvider: provider.name,
      liveDriveAvailableBytes,
    });

    if (!reservation.allowed || !reservation.sessionId) {
      return NextResponse.json(
        { error: reservation.error || 'Storage quota exceeded' },
        { status: reservation.statusCode || 403 }
      );
    }

    reservedSessionId = reservation.sessionId;
    await updateUploadSession(reservedSessionId, session.userId, { status: 'uploading' });

    // 4. Read file into buffer and upload via active StorageProvider
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeKeyName = sanitizedFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = crypto.randomUUID();
    const storageKey =
      rawStorageKey || `users/${session.userId}/${rawItemId}/${uniquePrefix}-${safeKeyName}`;

    const uploadResult = await provider.uploadFile({
      storageKey,
      filename: sanitizedFilename,
      mimeType,
      buffer,
      userId: session.userId,
      itemId: rawItemId,
    });

    // 5. Calculate expiration timestamp AFTER upload completes on the server
    const completedAtMs = Date.now();
    const expiresAtIso = new Date(
      completedAtMs + expValidation.durationSec * 1000
    ).toISOString();

    let itemType: 'image' | 'video' | 'file' = 'file';
    if (mimeType.startsWith('image/')) itemType = 'image';
    else if (mimeType.startsWith('video/')) itemType = 'video';

    // 6. Create or update item and file metadata in database
    const existingItem = await getItemById(rawItemId, session.userId, {
      includeExpired: true,
    });

    if (!existingItem) {
      await createItem({
        id: rawItemId,
        userId: session.userId,
        type: itemType,
        title: customTitle || sanitizedFilename,
        isFavourite: false,
        expirationDurationSec: expValidation.durationSec,
        expiresAt: expiresAtIso,
      });

      await createFileRecord({
        id: crypto.randomUUID(),
        itemId: rawItemId,
        userId: session.userId,
        storageKey: uploadResult.storageKey,
        originalFilename: filename,
        sanitizedFilename,
        mimeType,
        fileSize: uploadResult.size || fileSize,
        storageProvider: uploadResult.provider,
        providerFileId: uploadResult.fileId,
        uploadStatus: 'completed',
      });
    }

    await updateUploadSession(reservedSessionId, session.userId, {
      status: 'completed',
      storageKey: uploadResult.storageKey,
      providerFileId: uploadResult.fileId,
    });

    if (rawTags) {
      try {
        const parsedTags = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags;
        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          await syncItemTags(rawItemId, session.userId, parsedTags);
        }
      } catch {
        // Ignore malformed tags JSON
      }
    }

    const fullItem = await getItemById(rawItemId, session.userId);
    if (fullItem && fullItem.file) {
      fullItem.file.downloadUrl = `/api/storage/file/${fullItem.id}`;
    }

    return NextResponse.json(
      {
        success: true,
        provider: uploadResult.provider,
        storageKey: uploadResult.storageKey,
        item: fullItem,
      },
      { status: 201 }
    );
  } catch (err: any) {
    // Release reserved quota on failure and never create a falsely completed vault entry
    if (reservedSessionId) {
      await updateUploadSession(reservedSessionId, session.userId, {
        status: 'failed',
      }).catch(() => {});
    }
    console.error('Unified file upload error:', err?.message || 'Upload error');
    return NextResponse.json(
      { error: err?.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
