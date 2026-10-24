import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkRateLimit } from '@/lib/auth';
import {
  getConversationMessages,
  sendChatMessage,
  deleteConversationForUser,
} from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await getConversationMessages(id, session.userId);
    return NextResponse.json({
      success: true,
      conversation: data.conversation,
      messages: data.messages,
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to load messages';
    if (msg.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (msg.includes('not found')) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(`chat_msg_${session.userId}`, 60, 60000)) {
    return NextResponse.json(
      { error: 'Sending messages too quickly. Please wait a moment.' },
      { status: 429 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const messageType = body.messageType === 'attachment' ? 'attachment' : 'text';
    const textContent = typeof body.textContent === 'string' ? body.textContent : null;
    const sharedItemId =
      typeof body.sharedItemId === 'string'
        ? body.sharedItemId
        : typeof body.itemId === 'string'
        ? body.itemId
        : null;

    const message = await sendChatMessage({
      conversationId: id,
      senderId: session.userId,
      messageType,
      textContent,
      sharedItemId,
    });

    return NextResponse.json(
      {
        success: true,
        message,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = err?.message || 'Failed to send message';
    if (msg.startsWith('Forbidden') || msg.includes('blocked') || msg.includes('permission')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteConversationForUser(id, session.userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message:
        'Conversation removed from your chat list. Note: Removing a conversation from your screen hides your view of the history without erasing the other participant’s copy.',
    });
  } catch (err: any) {
    if (err?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to remove conversation' },
      { status: 500 }
    );
  }
}
