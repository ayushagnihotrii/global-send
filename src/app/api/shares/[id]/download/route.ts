import { NextRequest, NextResponse } from 'next/server';
import {
  getShareById,
  verifySharePassword,
  incrementShareDownload,
  recordShareAccess,
  getItemById,
  query,
} from '@/lib/db';
import {
  getStorageProvider,
  GoogleDriveStorageProvider,
  TelegramStorageProvider,
} from '@/lib/storage';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const share = await getShareById(id);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (share.isRevoked) {
      return NextResponse.json(
        { error: 'This share link has been revoked by the sender' },
        { status: 410 }
      );
    }

    if (share.isExpired) {
      return NextResponse.json(
        { error: 'This share link has expired and is no longer accessible' },
        { status: 410 }
      );
    }

    if (share.isExhausted) {
      return NextResponse.json(
        { error: 'Download limit has been reached for this file' },
        { status: 410 }
      );
    }

    // Password verification if required
    if (share.hasPassword) {
      const { searchParams } = new URL(req.url);
      const password =
        searchParams.get('password') ||
        req.headers.get('x-share-password') ||
        '';

      if (!password) {
        return NextResponse.json(
          { error: 'Password required to download this file' },
          { status: 401 }
        );
      }

      const isValid = await verifySharePassword(id, password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        );
      }
    }

    // Retrieve file record
    const fileRows = await query(
      `SELECT f.*, i.deleted_at, i.deletion_status, i.expires_at as item_expires_at
       FROM files f
       JOIN items i ON f.item_id = i.id
       WHERE i.id = $1
       LIMIT 1`,
      [share.itemId]
    );

    if (!fileRows.length) {
      return NextResponse.json({ error: 'File content not found' }, { status: 404 });
    }

    const file = fileRows[0];
    if (file.deleted_at || file.deletion_status === 'deleted' || file.deletion_status === 'expired') {
      return NextResponse.json({ error: 'File is no longer available' }, { status: 410 });
    }

    // Increment download count atomically
    const incrementResult = await incrementShareDownload(id);
    if (!incrementResult.allowed) {
      return NextResponse.json(
        { error: incrementResult.error || 'Download limit reached' },
        { status: 410 }
      );
    }

    // Record access log
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '';
    const userAgent = req.headers.get('user-agent') || '';

    await recordShareAccess({
      shareId: id,
      action: 'download',
      ip: clientIp || null,
      userAgent: userAgent || null,
    }).catch((e) => console.error('Failed to log share access:', e));

    // Parse HTTP Range header if any
    const rangeHeader = req.headers.get('range');
    let range: { start: number; end?: number } | undefined;

    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace('bytes=', '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      if (!isNaN(start) && start >= 0) {
        range = { start, end };
      }
    }

    // Determine storage provider
    const provider = file.storage_key.startsWith('gdrive://')
      ? new GoogleDriveStorageProvider()
      : file.storage_key.startsWith('telegram://') || file.storage_key.startsWith('tg://')
      ? new TelegramStorageProvider()
      : getStorageProvider();

    const result = await provider.getDownloadStream(file.storage_key, range);

    let webStream: ReadableStream;
    if (result.stream instanceof ReadableStream) {
      webStream = result.stream;
    } else if (result.stream && typeof (result.stream as any).on === 'function') {
      const nodeStream = result.stream as Readable;
      webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });
    } else {
      throw new Error('Unsupported stream type returned by storage provider');
    }

    const safeFilename = (file.sanitized_filename || file.original_filename || 'file').replace(
      /["\r\n]/g,
      '_'
    );
    const disposition = `attachment; filename="${encodeURIComponent(safeFilename)}"`;

    const headers: Record<string, string> = {
      'Content-Type': file.mime_type || result.mimeType || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    };

    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    } else if (result.size) {
      headers['Content-Length'] = String(result.size);
    }

    const status = range ? 206 : 200;
    return new NextResponse(webStream, { status, headers });
  } catch (err: any) {
    console.error('Error streaming share download:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to stream download' },
      { status: 500 }
    );
  }
}
