import { NextRequest, NextResponse } from 'next/server';
import { getShareById, verifySharePassword } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const share = await getShareById(id);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (share.isRevoked) {
      return NextResponse.json(
        { error: 'This share link has been revoked', code: 'REVOKED' },
        { status: 410 }
      );
    }

    if (share.isExpired) {
      return NextResponse.json(
        { error: 'This share link has expired', code: 'EXPIRED' },
        { status: 410 }
      );
    }

    if (share.isExhausted) {
      return NextResponse.json(
        { error: 'Download limit has been reached for this link', code: 'EXHAUSTED' },
        { status: 410 }
      );
    }

    if (share.hasPassword) {
      const body = await req.json().catch(() => ({}));
      const password = typeof body.password === 'string' ? body.password : '';

      if (!password) {
        return NextResponse.json(
          { error: 'Password required to access this file', code: 'PASSWORD_REQUIRED' },
          { status: 401 }
        );
      }

      const isValid = await verifySharePassword(id, password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect password', code: 'INVALID_PASSWORD' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      authorized: true,
      hasPassword: share.hasPassword,
    });
  } catch (err: any) {
    console.error('Error verifying share access:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to verify share access' },
      { status: 500 }
    );
  }
}
