import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createFolder, getFolders, getFolderPath } from '@/lib/db';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(120, 'Folder name is too long'),
  parentFolderId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parentFolderId = searchParams.get('parentFolderId') || undefined;
    const folders = await getFolders(session.userId, parentFolderId);

    let path: Array<{ id: string; name: string }> = [];
    if (parentFolderId && parentFolderId !== 'root' && parentFolderId !== 'all') {
      path = await getFolderPath(parentFolderId, session.userId);
    }

    return NextResponse.json({ success: true, folders, path });
  } catch (err: any) {
    console.error('List folders error:', err);
    return NextResponse.json({ error: 'Failed to retrieve folders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createFolderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid folder data' },
        { status: 400 }
      );
    }

    const folder = await createFolder({
      userId: session.userId,
      name: result.data.name,
      parentFolderId: result.data.parentFolderId || null,
    });

    return NextResponse.json({ success: true, folder }, { status: 201 });
  } catch (err: any) {
    console.error('Create folder error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create folder' }, { status: 500 });
  }
}
