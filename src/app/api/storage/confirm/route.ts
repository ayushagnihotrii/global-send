import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createItem, createFileRecord, syncItemTags, getItemById, query } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';

const confirmSchema = z.object({
  itemId: z.string().min(1),
  storageKey: z.string().min(1),
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = confirmSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { itemId, storageKey, originalFilename, mimeType, fileSize, tags } = result.data;
    const title = result.data.title?.trim() || originalFilename;

    // Check if item was already created by direct upload endpoint
    let existing = await getItemById(itemId, session.userId);
    if (!existing) {
      const fileRows = await query<any>(
        'SELECT item_id FROM files WHERE storage_key = $1 AND user_id = $2',
        [storageKey, session.userId]
      );
      if (fileRows.length > 0) {
        existing = await getItemById(fileRows[0].item_id, session.userId);
      }
    }
    if (existing) {
      return NextResponse.json({ success: true, item: existing });
    }

    // Verify storage object existence via active provider
    const provider = getStorageProvider();
    const verification = await provider.verifyFile(storageKey);
    if (!verification.exists) {
      return NextResponse.json(
        { error: 'File verification failed: Object was not uploaded to storage.' },
        { status: 400 }
      );
    }

    // Determine item type
    let itemType: 'image' | 'video' | 'file' = 'file';
    if (mimeType.startsWith('image/')) itemType = 'image';
    else if (mimeType.startsWith('video/')) itemType = 'video';

    // 1. Create item record
    await createItem({
      id: itemId,
      userId: session.userId,
      type: itemType,
      title,
    });

    // 2. Create file record
    const fileId = crypto.randomUUID();
    await createFileRecord({
      id: fileId,
      itemId,
      userId: session.userId,
      storageKey,
      originalFilename,
      mimeType,
      fileSize,
      uploadStatus: 'completed',
    });

    // 3. Sync tags
    if (tags && tags.length > 0) {
      await syncItemTags(itemId, session.userId, tags);
    }

    const fullItem = await getItemById(itemId, session.userId);
    return NextResponse.json({ success: true, item: fullItem });
  } catch (err: any) {
    console.error('Confirm upload error:', err);
    return NextResponse.json({ error: 'Failed to finalize file upload' }, { status: 500 });
  }
}
