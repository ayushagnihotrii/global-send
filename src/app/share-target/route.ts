import { NextRequest, NextResponse } from 'next/server';
import { savePwaStash, StashedFile } from '@/lib/pwa-stash';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string | null;
    const text = formData.get('text') as string | null;
    const url = formData.get('url') as string | null;

    const rawFiles = formData.getAll('files');
    const stashedFiles: StashedFile[] = [];

    for (const item of rawFiles) {
      if (item instanceof File) {
        const buffer = await item.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        stashedFiles.push({
          name: item.name || 'shared-file',
          type: item.type || 'application/octet-stream',
          size: item.size,
          dataBase64: base64,
        });
      }
    }

    const stashId = crypto.randomUUID();
    savePwaStash({
      id: stashId,
      title,
      text,
      url,
      files: stashedFiles,
    });

    const targetUrl = new URL(`/?pwa_staged=${stashId}`, req.url);
    return NextResponse.redirect(targetUrl, 303);
  } catch (err: any) {
    console.error('PWA Share Target receipt error:', err);
    return NextResponse.redirect(new URL('/?share_error=true', req.url), 303);
  }
}
