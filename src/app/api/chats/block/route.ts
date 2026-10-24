import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByUsername, blockUser, unblockUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUsername = typeof body.username === 'string' ? body.username.trim() : '';
    const action = body.action === 'unblock' ? 'unblock' : 'block';

    if (!targetUsername) {
      return NextResponse.json(
        { error: 'Target username is required' },
        { status: 400 }
      );
    }

    const targetUser = await getUserByUsername(targetUsername);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === session.userId) {
      return NextResponse.json(
        { error: 'You cannot block yourself' },
        { status: 400 }
      );
    }

    if (action === 'unblock') {
      await unblockUser(session.userId, targetUser.id);
      return NextResponse.json({
        success: true,
        isBlockedByMe: false,
        message: `Unblocked @${targetUser.display_username || targetUser.username}`,
      });
    } else {
      await blockUser(session.userId, targetUser.id);
      return NextResponse.json({
        success: true,
        isBlockedByMe: true,
        message: `Blocked @${targetUser.display_username || targetUser.username}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update block status' },
      { status: 500 }
    );
  }
}
