import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
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

  // 1. Verify item ownership in database
  const rows = await query<{
    id: string;
    item_id: string;
    user_id: string;
    storage_key: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
  }>(
    `SELECT f.*, i.user_id FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE (i.id = $1 OR f.id = $1) AND i.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const file = rows[0];

  // 2. Strict authorization check
  if (file.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Parse optional HTTP Range header (for video/audio scrubbing)
  const rangeHeader = req.headers.get('range');
  let range: { start: number; end?: number } | undefined;

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace('bytes=', '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : undefined;
    if (!isNaN(start)) {
      range = { start, end };
    }
  }

  try {
    // 4. Select appropriate provider
    const provider = file.storage_key.startsWith('gdrive://')
      ? new GoogleDriveStorageProvider()
      : getStorageProvider();

    const result = await provider.getDownloadStream(file.storage_key, range);

    // 5. Convert stream to web ReadableStream if needed
    let webStream: ReadableStream;
    if (result.stream instanceof ReadableStream) {
      webStream = result.stream;
    } else if (result.stream && typeof (result.stream as any).on === 'function') {
      const nodeStream = result.stream as Readable;
      webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', chunk => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', err => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });
    } else {
      throw new Error('Unsupported stream format returned from storage provider');
    }

    const disposition = asAttachment
      ? `attachment; filename="${encodeURIComponent(file.original_filename)}"`
      : `inline; filename="${encodeURIComponent(file.original_filename)}"`;

    const headers: Record<string, string> = {
      'Content-Type': result.mimeType || file.mime_type || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };

    if (result.size !== undefined) {
      headers['Content-Length'] = result.size.toString();
    }

    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    }

    return new NextResponse(webStream, {
      status: result.statusCode || (range ? 206 : 200),
      headers,
    });
  } catch (err: any) {
    console.error('Download stream error:', err);
    return NextResponse.json({ error: err.message || 'Failed to stream file' }, { status: 500 });
  }
}
