import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUserStorageUsage,
  updateUserAvatar,
  enqueueStorageDeletion,
  getUserById,
} from '@/lib/db';
import { validateAndSanitizeAvatar } from '@/lib/image-security';
import { getStorageProvider, deleteStorageFile } from '@/lib/storage';
import { SITE_CONFIG } from '@/config/site';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let rawBuffer: Buffer;
    let declaredMime = '';
    let originalFilename = 'avatar';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = (formData.get('avatar') || formData.get('file')) as File | null;
      if (!file) {
        return NextResponse.json(
          { error: 'No profile picture file provided' },
          { status: 400 }
        );
      }
      declaredMime = file.type || '';
      originalFilename = file.name || 'avatar';

      // Fast pre-check before reading oversized stream
      if (file.size > SITE_CONFIG.maxAvatarSizeBytes) {
        return NextResponse.json(
          {
            error: `Profile picture exceeds the strict 100 KiB (102,400 bytes) limit (received ${file.size.toLocaleString()} bytes).`,
          },
          { status: 400 }
        );
      }

      const ab = await file.arrayBuffer();
      rawBuffer = Buffer.from(ab);
    } else {
      const body = await req.json().catch(() => ({}));
      if (!body.dataUrl || typeof body.dataUrl !== 'string') {
        return NextResponse.json(
          { error: 'No profile picture provided' },
          { status: 400 }
        );
      }
      const match = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid base64 image payload' },
          { status: 400 }
        );
      }
      declaredMime = match[1];
      originalFilename = body.filename || 'avatar';
      rawBuffer = Buffer.from(match[2], 'base64');
    }

    // 1. Validate magic bytes, enforce <= 102,400 bytes, reject SVG/HTML, and strip EXIF metadata
    const validated = validateAndSanitizeAvatar(
      rawBuffer,
      declaredMime,
      originalFilename
    );

    if (!validated.valid || !validated.sanitizedBuffer || !validated.mimeType) {
      return NextResponse.json(
        { error: validated.error || 'Invalid profile picture' },
        { status: 400 }
      );
    }

    // 2. Enforce storage budget
    const usage = await getUserStorageUsage(session.userId);
    const netDelta = validated.sanitizedBuffer.length - (usage.avatarBytes || 0);
    if (netDelta > 0 && usage.usedBytes + usage.reservedBytes + netDelta > usage.limitBytes) {
      return NextResponse.json(
        { error: 'Storage quota exceeded. Cannot upload profile picture.' },
        { status: 403 }
      );
    }

    // 3. Persist to storage provider (and store compact base64 representation for fast chat rendering)
    const provider = getStorageProvider();
    const avatarStorageKeyCandidate = `users/${session.userId}/avatar/${crypto.randomUUID()}.${validated.extension}`;
    let storedKey: string | null = null;

    try {
      const uploadRes = await provider.uploadFile({
        storageKey: avatarStorageKeyCandidate,
        filename: `avatar_${session.username}.${validated.extension}`,
        mimeType: validated.mimeType,
        buffer: validated.sanitizedBuffer,
        userId: session.userId,
        itemId: `avatar_${session.userId}`,
      });
      storedKey = uploadRes.storageKey;
    } catch {
      // Sanitized base64 (<100 KiB) is persisted in users.avatar_data and served by /api/user/avatar/[username]
      storedKey = null;
    }

    const base64Data = validated.sanitizedBuffer.toString('base64');
    const { previousStorageKey } = await updateUserAvatar(session.userId, {
      storageKey: storedKey,
      mimeType: validated.mimeType,
      sizeBytes: validated.sanitizedBuffer.length,
      avatarData: base64Data,
    });

    // 4. Permanently delete previous avatar from storage when replaced
    if (previousStorageKey && previousStorageKey !== storedKey) {
      await enqueueStorageDeletion(
        previousStorageKey,
        previousStorageKey.startsWith('gdrive://') ? 'google_drive' : provider.name,
        'avatar_replaced'
      );
      await deleteStorageFile(previousStorageKey).catch(() => false);
    }

    const updatedUser = await getUserById(session.userId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      avatarUrl: updatedUser?.avatarUrl || null,
      sizeBytes: validated.sanitizedBuffer.length,
      avatarSizeBytes: validated.sanitizedBuffer.length,
      mimeType: validated.mimeType,
    });
  } catch (err: any) {
    console.error('[Global Send Avatar Upload Error]:', err?.message || 'Error');
    return NextResponse.json(
      { error: err?.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { previousStorageKey } = await updateUserAvatar(session.userId, {
      storageKey: null,
      mimeType: null,
      sizeBytes: 0,
      avatarData: null,
    });

    if (previousStorageKey) {
      await enqueueStorageDeletion(
        previousStorageKey,
        previousStorageKey.startsWith('gdrive://') ? 'google_drive' : 'local',
        'avatar_removed'
      );
      await deleteStorageFile(previousStorageKey).catch(() => false);
    }

    const updatedUser = await getUserById(session.userId);
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile picture removed',
    });
  } catch (err: any) {
    console.error('[Global Send Avatar Delete Error]:', err?.message || 'Error');
    return NextResponse.json(
      { error: 'Failed to remove profile picture' },
      { status: 500 }
    );
  }
}
