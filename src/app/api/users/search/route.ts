import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkRateLimit } from '@/lib/auth';
import { searchPublicUsers } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!checkRateLimit(`user_search_${session.userId}_${ip}`, 30, 60000)) {
    return NextResponse.json(
      { error: 'Too many search requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      users: [],
    });
  }

  try {
    // Returns ONLY public username and avatarUrl — no internal IDs or private metadata
    const users = await searchPublicUsers(q, session.userId, 12);
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err: any) {
    console.error('[Global Send User Search Error]:', err?.message || 'Error');
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
