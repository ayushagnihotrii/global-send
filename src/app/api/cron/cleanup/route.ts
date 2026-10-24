import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isUserAdmin } from '@/lib/db';
import { executeFullCleanup } from '@/lib/cleanup';

function verifyCronBearerSecret(authHeader: string | null, cronSecret: string): boolean {
  if (!authHeader || !cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  try {
    const a = Buffer.from(authHeader, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function isAuthorizedCleanupRequest(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization');

  if (cronSecret && verifyCronBearerSecret(authHeader, cronSecret)) {
    return true;
  }

  // Allow logged-in storage administrator to trigger cleanup manually
  const session = await getSession();
  if (session && (await isUserAdmin(session.userId))) {
    return true;
  }

  // In local development / automated test suite, allow if CRON_SECRET is not set
  if (process.env.NODE_ENV !== 'production' && !cronSecret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedCleanupRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized cleanup request' }, { status: 401 });
  }

  try {
    const summary = await executeFullCleanup();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err: any) {
    console.error('[Global Send Scheduled Cleanup Error]:', err?.message || 'Cleanup error');
    return NextResponse.json(
      { error: 'Cleanup execution failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
