import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserStorageUsage, createItem, createFileRecord, syncItemTags, getItemById } from '@/lib/db';
import { SITE_CONFIG } from '@/config/site';
import { getStorageProvider } from '@/lib/storage';

export const maxDuration = 60; // Allow sufficient time for larger uploads

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form-data' }, { status: 400 });
    }

    const fileSize = file.size;
    const filename = file.name || 'unnamed_file';
    const mimeType = file.type || 'application/octet-stream';

    // 1. Enforce individual file size limit
    if (fileSize > SITE_CONFIG.maxUploadSizeBytes) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed upload size of ${SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)} MB.` },
        { status: 400 }
      );
    }

    // 2. Enforce user total storage quota
    const usage = await getUserStorageUsage(session.userId);
    if (usage.usedBytes + fileSize > usage.limitBytes) {
      return NextResponse.json(
        { error: 'Storage quota exceeded. Please delete some files or empty trash to free up space.' },
        { status: 403 }
      );
    }

    // 3. Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Generate unique storage key
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = crypto.randomUUID();
    const storageKey = rawStorageKey || `users/${session.userId}/${rawItemId}/${uniquePrefix}-${safeFilename}`;

    // 5. Upload via active StorageProvider (Google Drive, Cloudflare R2, or Local Disk)
    const provider = getStorageProvider();
    const uploadResult = await provider.uploadFile({
      storageKey,
      filename,
      mimeType,
      buffer,
      userId: session.userId,
      itemId: rawItemId,
    });

    // 6. Determine item type
    let itemType: 'image' | 'video' | 'file' = 'file';
    if (mimeType.startsWith('image/')) itemType = 'image';
    else if (mimeType.startsWith('video/')) itemType = 'video';

    const itemTitle = customTitle || filename;

    // 7. Persist item record in database
    await createItem({
      id: rawItemId,
      userId: session.userId,
      type: itemType,
      title: itemTitle,
    });

    // 8. Persist file metadata record
    const fileId = crypto.randomUUID();
    await createFileRecord({
      id: fileId,
      itemId: rawItemId,
      userId: session.userId,
      storageKey: uploadResult.storageKey,
      originalFilename: filename,
      mimeType,
      fileSize,
      uploadStatus: 'completed',
    });

    // 9. Sync tags if provided
    let tagList: string[] = [];
    if (rawTags) {
      try {
        tagList = typeof rawTags === 'string' ? JSON.parse(rawTags) : [];
      } catch {
        tagList = String(rawTags)
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
      }
      if (tagList.length > 0) {
        await syncItemTags(rawItemId, session.userId, tagList);
      }
    }

    // 10. Return full hydrated item
    const fullItem = await getItemById(rawItemId, session.userId);
    if (fullItem?.file) {
      fullItem.file.downloadUrl = `/api/storage/file/${fullItem.id}`;
    }

    return NextResponse.json({
      success: true,
      item: fullItem,
      provider: uploadResult.provider,
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload file' }, { status: 500 });
  }
}
