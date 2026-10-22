import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Local storage endpoints are disabled in production. QuickVault requires Cloudflare R2.' },
      { status: 403 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await params;
  const storageKey = key.join('/');

  // Authorization check: ensure key belongs to user
  if (!storageKey.startsWith(`users/${session.userId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), '.data', 'uploads', storageKey);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  // Simple mime detection
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.txt') contentType = 'text/plain';
  else if (ext === '.json') contentType = 'application/json';

  // Support range headers for video playback seeking
  const range = req.headers.get('range');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    // Node readable to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', chunk => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', err => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType,
      },
    });
  }

  const fileStream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', chunk => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', err => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
