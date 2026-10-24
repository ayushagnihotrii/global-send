import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByUsername } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username } = await params;
  const userRow = await getUserByUsername(decodeURIComponent(username));

  if (!userRow || !userRow.avatar_data) {
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  }

  const mimeType =
    userRow.avatar_mime_type === 'image/png' ||
    userRow.avatar_mime_type === 'image/webp' ||
    userRow.avatar_mime_type === 'image/jpeg'
      ? userRow.avatar_mime_type
      : 'image/jpeg';

  const buffer = Buffer.from(userRow.avatar_data, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, max-age=60, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
