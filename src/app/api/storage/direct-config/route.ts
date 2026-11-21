import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStorageConfig } from '@/lib/env-config';

/**
 * GET /api/storage/direct-config
 * Provides authenticated desktop client with direct storage provider credentials
 * so massive files (e.g. 700MB - 10GB+) can be uploaded directly from the PC to Telegram MTProto,
 * bypassing serverless body limits, RAM limits, and Vercel timeouts completely.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getStorageConfig();

  if (config.storage.driver === 'telegram' && config.storage.telegram) {
    const rawChannelId =
      config.storage.telegram.channelId || process.env.TELEGRAM_STORAGE_CHANNEL_ID || '';
    const sessionStr =
      config.storage.telegram.sessionString || process.env.TELEGRAM_SESSION_STRING || '';

    return NextResponse.json({
      success: true,
      provider: 'telegram',
      telegram: {
        apiId: config.storage.telegram.apiId,
        apiHash: config.storage.telegram.apiHash,
        channelId: rawChannelId,
        botToken: config.storage.telegram.botToken,
        sessionString: sessionStr,
      },
    });
  }

  return NextResponse.json({
    success: true,
    provider: config.storage.driver,
  });
}
