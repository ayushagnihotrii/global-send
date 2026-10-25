import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  reserveUploadSession,
  getUploadSession,
  updateUploadSession,
  validateExpirationDuration,
  sanitizeFilenameForDisplay,
  createItem,
  createFileRecord,
  getItemById,
  enqueueStorageDeletion,
} from '@/lib/db';
import { getStorageProvider, deleteStorageFile } from '@/lib/storage';

// In-memory staging buffer map for local/test chunked resumable sessions
const localChunkBuffers = new Map<string, Buffer[]>();

export const maxDuration = 60;

/**
 * POST /api/storage/upload-session
 * Initiates a resumable file upload session, validates quota & expiration,
 * reserves capacity, and creates a provider resumable session (Google Drive).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const filename = typeof body.filename === 'string' ? body.filename : 'file';
    const sanitizedFilename = sanitizeFilenameForDisplay(filename);
    const mimeType =
      typeof body.mimeType === 'string' && body.mimeType
        ? body.mimeType
        : 'application/octet-stream';
    const fileSize = Number(body.fileSize || 0);
    const title = typeof body.title === 'string' ? body.title.trim() : sanitizedFilename;
    const rawExp = body.expirationSeconds ?? body.expirationDurationSec;

    const expValidation = validateExpirationDuration(
      rawExp !== undefined && rawExp !== null ? Number(rawExp) : undefined
    );
    if (!expValidation.valid) {
      return NextResponse.json(
        { error: expValidation.error || 'Invalid expiration duration' },
        { status: 400 }
      );
    }

    const provider = getStorageProvider();
    let liveDriveAvailableBytes: number | undefined;
    if (provider.name === 'google_drive' && provider.getQuota) {
      const quota = await provider.getQuota();
      if (typeof quota.availableBytes === 'number') {
        liveDriveAvailableBytes = quota.availableBytes;
      }
    }

    const itemId = crypto.randomUUID();
    const reservation = await reserveUploadSession({
      userId: session.userId,
      itemId,
      title: title || sanitizedFilename,
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

    // If Google Drive provider, initiate a real Drive resumable upload session server-side
    if (provider.initiateResumableUpload) {
      try {
        const initRes = await provider.initiateResumableUpload({
          filename: sanitizedFilename,
          mimeType,
          totalBytes: fileSize,
          userId: session.userId,
          itemId,
        });
        await updateUploadSession(reservation.sessionId, session.userId, {
          status: 'uploading',
          providerUploadUrl: initRes.uploadSessionUrl,
        });
      } catch {
        // Fall back to server-side chunk assembly + provider.uploadFile (database blob fallback)
        localChunkBuffers.set(reservation.sessionId, []);
        await updateUploadSession(reservation.sessionId, session.userId, {
          status: 'uploading',
        });
      }
    } else {
      localChunkBuffers.set(reservation.sessionId, []);
      await updateUploadSession(reservation.sessionId, session.userId, {
        status: 'uploading',
      });
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: reservation.sessionId,
        itemId,
        chunkSize: 2 * 1024 * 1024, // 2 MiB recommended chunk size (multiple of 256 KiB for Drive)
        expirationDurationSec: expValidation.durationSec,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Global Send Upload Session Init Error]:', err?.message || 'Error');
    return NextResponse.json(
      { error: 'Failed to initialize upload session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/upload-session?sessionId=...&offset=...
 * Transfers a chunk to the active resumable upload session and finalizes the vault item
 * only after the complete file is verified.
 */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId') || '';
  const offset = Number(searchParams.get('offset') || 0);

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const uploadSess = await getUploadSession(sessionId, session.userId);
  if (!uploadSess) {
    return NextResponse.json({ error: 'Upload session not found' }, { status: 404 });
  }

  if (uploadSess.status === 'cancelled' || uploadSess.status === 'failed' || uploadSess.status === 'expired') {
    return NextResponse.json(
      { error: `Upload session is ${uploadSess.status}` },
      { status: 409 }
    );
  }

  if (uploadSess.status === 'completed') {
    const existingItem = await getItemById(uploadSess.item_id, session.userId);
    return NextResponse.json({ success: true, completed: true, item: existingItem });
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const chunk = Buffer.from(arrayBuffer);
    const totalBytes = Number(uploadSess.reserved_bytes);
    const provider = getStorageProvider();

    let completed = false;
    let finalStorageKey = '';
    let finalFileId: string | undefined;
    let finalSize = totalBytes;

    if (uploadSess.provider_upload_url && provider.uploadResumableChunk) {
      const chunkRes = await provider.uploadResumableChunk(
        uploadSess.provider_upload_url,
        chunk,
        offset,
        totalBytes,
        uploadSess.mime_type
      );
      completed = chunkRes.completed;
      if (chunkRes.storageKey) finalStorageKey = chunkRes.storageKey;
      if (chunkRes.fileId) finalFileId = chunkRes.fileId;
      if (chunkRes.size) finalSize = chunkRes.size;
    } else {
      // Local / non-Drive chunk assembly
      const chunks = localChunkBuffers.get(sessionId) || [];
      chunks.push(chunk);
      localChunkBuffers.set(sessionId, chunks);

      const accumulatedBytes = chunks.reduce((acc, c) => acc + c.length, 0);
      if (accumulatedBytes >= totalBytes) {
        const fullBuffer = Buffer.concat(chunks);
        localChunkBuffers.delete(sessionId);

        const safeKeyName = uploadSess.sanitized_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageKey = `users/${session.userId}/${uploadSess.item_id}/${crypto.randomUUID()}-${safeKeyName}`;
        const uploadRes = await provider.uploadFile({
          storageKey,
          filename: uploadSess.sanitized_filename,
          mimeType: uploadSess.mime_type,
          buffer: fullBuffer,
          userId: session.userId,
          itemId: uploadSess.item_id,
        });
        completed = true;
        finalStorageKey = uploadRes.storageKey;
        finalFileId = uploadRes.fileId;
        finalSize = uploadRes.size;
      }
    }

    if (!completed) {
      return NextResponse.json({
        success: true,
        completed: false,
        nextOffset: offset + chunk.length,
      });
    }

    // Finalize vault item ONLY after complete transfer is verified
    const durationSec = Number(uploadSess.expiration_duration_sec || 86400);
    const expiresAtIso = new Date(Date.now() + durationSec * 1000).toISOString();

    let itemType: 'image' | 'video' | 'file' = 'file';
    if (uploadSess.mime_type.startsWith('image/')) itemType = 'image';
    else if (uploadSess.mime_type.startsWith('video/')) itemType = 'video';

    await createItem({
      id: uploadSess.item_id,
      userId: session.userId,
      type: itemType,
      title: uploadSess.title || uploadSess.sanitized_filename,
      isFavourite: false,
      expirationDurationSec: durationSec,
      expiresAt: expiresAtIso,
    });

    await createFileRecord({
      id: crypto.randomUUID(),
      itemId: uploadSess.item_id,
      userId: session.userId,
      storageKey: finalStorageKey,
      originalFilename: uploadSess.original_filename,
      sanitizedFilename: uploadSess.sanitized_filename,
      mimeType: uploadSess.mime_type,
      fileSize: finalSize,
      storageProvider: provider.name,
      providerFileId: finalFileId,
      uploadStatus: 'completed',
    });

    await updateUploadSession(sessionId, session.userId, {
      status: 'completed',
      storageKey: finalStorageKey,
      providerFileId: finalFileId,
    });

    const fullItem = await getItemById(uploadSess.item_id, session.userId);
    if (fullItem && fullItem.file) {
      fullItem.file.downloadUrl = `/api/storage/file/${fullItem.id}`;
    }

    return NextResponse.json({
      success: true,
      completed: true,
      item: fullItem,
    });
  } catch (err: any) {
    localChunkBuffers.delete(sessionId);
    await updateUploadSession(sessionId, session.userId, { status: 'failed' }).catch(() => {});
    return NextResponse.json(
      { error: err?.message || 'Chunk upload failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/upload-session?sessionId=...
 * Cancels an in-progress upload session, aborts the provider resumable session,
 * deletes any partial storage object, and releases reserved quota.
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId') || '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const uploadSess = await getUploadSession(sessionId, session.userId);
  if (!uploadSess) {
    return NextResponse.json({ error: 'Upload session not found' }, { status: 404 });
  }

  localChunkBuffers.delete(sessionId);

  const provider = getStorageProvider();
  if (uploadSess.provider_upload_url && provider.abortResumableUpload) {
    await provider.abortResumableUpload(uploadSess.provider_upload_url).catch(() => false);
  }

  if (uploadSess.storage_key) {
    await enqueueStorageDeletion(
      uploadSess.storage_key,
      uploadSess.storage_provider || provider.name,
      'upload_cancelled'
    );
    await deleteStorageFile(uploadSess.storage_key).catch(() => false);
  }

  await updateUploadSession(sessionId, session.userId, { status: 'cancelled' });

  return NextResponse.json({
    success: true,
    message: 'Upload cancelled and reserved storage quota released.',
  });
}
