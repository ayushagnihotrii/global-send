import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import {
  getItemById,
  updateItem,
  softDeleteItem,
  permanentDeleteItem,
  syncItemTags,
} from '@/lib/db';
import { deleteStorageFile } from '@/lib/storage';
import { executeFullCleanup } from '@/lib/cleanup';

const updateSchema = z.object({
  title: z.string().optional(),
  textContent: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isFavourite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  // getItemById strictly rejects expired or deleted items
  const item = await getItemById(id, session.userId);

  if (!item) {
    return NextResponse.json({ error: 'Item not found or has expired' }, { status: 404 });
  }

  if (item.file) {
    item.file.downloadUrl = `/api/storage/file/${item.id}`;
  }

  return NextResponse.json({ success: true, item });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getItemById(id, session.userId);
  if (!existing) {
    return NextResponse.json({ error: 'Item not found or has expired' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { title, textContent, url, note, isFavourite, tags } = result.data;

    await updateItem(id, session.userId, {
      title,
      textContent: textContent ?? undefined,
      url: url ?? undefined,
      note: note ?? undefined,
      isFavourite,
    });

    if (tags !== undefined) {
      await syncItemTags(id, session.userId, tags);
    }

    const updated = await getItemById(id, session.userId);
    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Update item error:', err?.message || 'Error');
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  // Default to permanent deletion or support soft delete if permanent=false
  const permanent = searchParams.get('permanent') !== 'false';

  const existing = await getItemById(id, session.userId, { includeExpired: true });
  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  try {
    if (permanent) {
      const storageKey = await permanentDeleteItem(id, session.userId);
      if (storageKey) {
        await deleteStorageFile(storageKey).catch(() => false);
        await executeFullCleanup().catch(() => {});
      }
      return NextResponse.json({ success: true, message: 'Item permanently deleted' });
    } else {
      await softDeleteItem(id, session.userId);
      return NextResponse.json({ success: true, message: 'Item moved to trash' });
    }
  } catch (err: any) {
    console.error('Delete item error:', err?.message || 'Error');
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
