import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { authorizeFileAccess } from '@/lib/db';
import { getStorageProvider, GoogleDriveStorageProvider } from '@/lib/storage';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const asAttachment = searchParams.get('download') === 'true';

  // 1. Strictly verify item existence, non-expiration, and owner/recipient permission
  const authResult = await authorizeFileAccess(id, session.userId);

  if (authResult.status === 'not_found') {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (authResult.status === 'expired') {
    return NextResponse.json(
      { error: 'File has expired and is no longer available' },
      { status: 410 }
    );
  }

  if (authResult.status === 'forbidden' || !authResult.file) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = authResult.file;

  // 2. Parse optional HTTP Range header (for video/audio scrubbing)
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

  try {
    const provider = file.storage_key.startsWith('gdrive://')
      ? new GoogleDriveStorageProvider()
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
    const disposition = asAttachment
      ? `attachment; filename="${encodeURIComponent(safeFilename)}"`
      : `inline; filename="${encodeURIComponent(safeFilename)}"`;

    const headers: Record<string, string> = {
      'Content-Type': file.mime_type || result.mimeType || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      // Never cache expiring private files in shared or persistent browser caches
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    };

    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    } else if (result.size) {
      headers['Content-Length'] = result.size.toString();
    }

    return new NextResponse(webStream, {
      status: result.statusCode || 200,
      headers,
    });
  } catch (err: any) {
    console.error(`Error streaming file (${file.storage_key}):`, err?.message || 'Error');
    return NextResponse.json(
      { error: err?.message || 'Failed to stream file from storage' },
      { status: 500 }
    );
  }
}
