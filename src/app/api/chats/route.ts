import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkRateLimit } from '@/lib/auth';
import { listUserConversations, getOrCreateConversation } from '@/lib/db';
import { triggerOpportunisticCleanup } from '@/lib/cleanup';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  triggerOpportunisticCleanup();

  try {
    const conversations = await listUserConversations(session.userId);
    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (err: any) {
    console.error('[Global Send List Chats Error]:', err?.message || 'Error');
    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(`chat_start_${session.userId}`, 20, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUsername = typeof body.username === 'string' ? body.username.trim() : '';

    if (!targetUsername) {
      return NextResponse.json(
        { error: 'Target username is required' },
        { status: 400 }
      );
    }

    const { conversation } = await getOrCreateConversation(
      session.userId,
      targetUsername
    );

    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = err?.message || 'Failed to start conversation';
    if (msg === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (msg.includes('yourself')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[Global Send Start Chat Error]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
