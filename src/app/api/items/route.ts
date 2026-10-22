import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getItems, createItem, syncItemTags } from '@/lib/db';
import { generateTitleFromContent } from '@/lib/utils';
import { isR2Configured, createPresignedDownloadUrl } from '@/lib/r2';

const createItemSchema = z.object({
  type: z.enum(['text', 'link', 'image', 'video', 'file']),
  title: z.string().optional().default(''),
  textContent: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isFavourite: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const isFavourite = searchParams.get('favourite') === 'true';
    const inTrash = searchParams.get('inTrash') === 'true';
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'created_desc';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const items = await getItems({
      userId: session.userId,
      type,
      isFavourite: isFavourite ? true : undefined,
      inTrash,
      tag,
      search,
      sortBy,
      limit,
      offset,
    });

    // Populate fresh signed download URLs for files
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (item.file) {
          try {
            if (isR2Configured() && !item.file.storageKey.startsWith('gdrive://')) {
              const url = await createPresignedDownloadUrl(
                item.file.storageKey,
                item.file.originalFilename,
                false,
                3600 // 1 hour
              );
              return { ...item, file: { ...item.file, downloadUrl: url } };
            } else {
              // Unified file streaming endpoint
              const url = `/api/storage/file/${item.id}`;
              return { ...item, file: { ...item.file, downloadUrl: url } };
            }
          } catch (e) {
            console.error('Error signing download URL:', e);
            return { ...item, file: { ...item.file, downloadUrl: `/api/storage/file/${item.id}` } };
          }
        }
        return item;
      })
    );

    return NextResponse.json({ success: true, items: enrichedItems });
  } catch (err: any) {
    console.error('List items error:', err);
    return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { type, textContent, url, note, isFavourite, tags } = result.data;
    let title = result.data.title.trim();

    // Auto-generate title if missing
    if (!title) {
      if (type === 'text') {
        title = generateTitleFromContent(textContent, 'Untitled text');
      } else if (type === 'link') {
        try {
          const parsed = new URL(url || '');
          title = parsed.hostname.replace(/^www\./, '') || 'Saved link';
        } catch {
          title = 'Saved link';
        }
      } else {
        title = 'Untitled item';
      }
    }

    const itemId = crypto.randomUUID();
    await createItem({
      id: itemId,
      userId: session.userId,
      type,
      title,
      textContent,
      url,
      note,
      isFavourite,
    });

    if (tags && tags.length > 0) {
      await syncItemTags(itemId, session.userId, tags);
    }

    return NextResponse.json({
      success: true,
      item: {
        id: itemId,
        userId: session.userId,
        type,
        title,
        textContent,
        url,
        note,
        isFavourite,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Create item error:', err);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }
}
