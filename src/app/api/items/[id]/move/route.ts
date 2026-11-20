import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { moveItemToFolder, getItemById } from '@/lib/db';

const moveItemSchema = z.object({
  targetFolderId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const result = moveItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid move request' },
        { status: 400 }
      );
    }

    const item = await getItemById(id, session.userId, { includeExpired: true });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await moveItemToFolder(id, session.userId, result.data.targetFolderId || null);

    const updated = await getItemById(id, session.userId, { includeExpired: true });
    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Move item error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to move item' }, { status: 500 });
  }
}
