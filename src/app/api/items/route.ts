import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import {
  getItems,
  createItem,
  syncItemTags,
  validateExpirationDuration,
  getItemById,
} from '@/lib/db';
import { generateTitleFromContent } from '@/lib/utils';
import { triggerOpportunisticCleanup } from '@/lib/cleanup';

const createItemSchema = z.object({
  type: z.enum(['text', 'link', 'image', 'video', 'file']),
  title: z.string().optional().default(''),
  textContent: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isFavourite: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  expirationSeconds: z.number().optional().nullable(),
  expirationDurationSec: z.number().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger non-blocking background expiration cleanup opportunistically
  triggerOpportunisticCleanup();

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

    // Route all file downloads through the authorized, expiration-enforced endpoint
    const enrichedItems = items.map((item) => {
      if (item.file && !item.isExpired) {
        return {
          ...item,
          file: {
            ...item.file,
            downloadUrl: `/api/storage/file/${item.id}`,
          },
        };
      }
      return item;
    });

    return NextResponse.json({ success: true, items: enrichedItems });
  } catch (err: any) {
    console.error('List items error:', err?.message || 'Error');
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

    const {
      type,
      textContent,
      url,
      note,
      isFavourite,
      tags,
      expirationSeconds,
      expirationDurationSec,
    } = result.data;

    // Validate requested expiration duration on the server (default: 24 hours = 86400s)
    const rawDuration = expirationSeconds ?? expirationDurationSec ?? undefined;
    const expValidation = validateExpirationDuration(rawDuration);
    if (!expValidation.valid) {
      return NextResponse.json(
        { error: expValidation.error || 'Invalid expiration duration' },
        { status: 400 }
      );
    }

    let title = result.data.title.trim();
    if (!title) {
      if (type === 'text' && textContent) {
        title = generateTitleFromContent(textContent);
      } else if (type === 'link' && url) {
        title = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60);
      } else {
        title = `Untitled ${type}`;
      }
    }

    if (type === 'text' && (!textContent || !textContent.trim())) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    if (type === 'link' && (!url || !url.trim())) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();

    await createItem({
      id,
      userId: session.userId,
      type,
      title,
      textContent: textContent || null,
      url: url || null,
      note: note || null,
      isFavourite,
      expirationDurationSec: expValidation.durationSec,
      expiresAt: expValidation.expiresAtIso,
    });

    if (tags && tags.length > 0) {
      await syncItemTags(id, session.userId, tags);
    }

    const created = await getItemById(id, session.userId);

    return NextResponse.json(
      {
        success: true,
        item: created || {
          id,
          userId: session.userId,
          type,
          title,
          textContent: textContent || null,
          url: url || null,
          note: note || null,
          isFavourite,
          expiresAt: expValidation.expiresAtIso,
          expirationDurationSec: expValidation.durationSec,
          tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Create item error:', err?.message || 'Error');
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
