import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const storageKey = formData.get('storageKey') as string | null;

    if (!file || !storageKey) {
      return NextResponse.json({ error: 'File and storageKey are required' }, { status: 400 });
    }

    // Verify key belongs to user
    if (!storageKey.startsWith(`users/${session.userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), '.data', 'uploads');
    const targetPath = path.join(uploadsDir, storageKey);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Local upload error:', err);
    return NextResponse.json({ error: 'Failed to process local upload' }, { status: 500 });
  }
}
