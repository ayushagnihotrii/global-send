import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { moveMultipleItemsToFolder, softDeleteItem, permanentDeleteItem, toggleItemFavourite } from '@/lib/db';

const batchActionSchema = z.object({
  action: z.enum(['move', 'delete', 'permanent_delete', 'favourite']),
  itemIds: z.array(z.string().min(1)).min(1),
  targetFolderId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = batchActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid batch request' },
        { status: 400 }
      );
    }

    const { action, itemIds, targetFolderId } = result.data;

    if (action === 'move') {
      const movedCount = await moveMultipleItemsToFolder(itemIds, session.userId, targetFolderId || null);
      return NextResponse.json({ success: true, count: movedCount, message: `Moved ${movedCount} item${movedCount > 1 ? 's' : ''}` });
    }

    if (action === 'delete') {
      let count = 0;
      for (const id of itemIds) {
        await softDeleteItem(id, session.userId).catch(() => {});
        count++;
      }
      return NextResponse.json({ success: true, count, message: `Moved ${count} item${count > 1 ? 's' : ''} to Trash` });
    }

    if (action === 'permanent_delete') {
      let count = 0;
      for (const id of itemIds) {
        await permanentDeleteItem(id, session.userId).catch(() => {});
        count++;
      }
      return NextResponse.json({ success: true, count, message: `Permanently deleted ${count} item${count > 1 ? 's' : ''}` });
    }

    if (action === 'favourite') {
      let count = 0;
      for (const id of itemIds) {
        await toggleItemFavourite(id, session.userId).catch(() => {});
        count++;
      }
      return NextResponse.json({ success: true, count, message: `Updated favourites for ${count} item${count > 1 ? 's' : ''}` });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Batch action error:', err);
    return NextResponse.json({ error: err?.message || 'Batch operation failed' }, { status: 500 });
  }
}

