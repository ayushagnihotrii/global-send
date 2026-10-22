import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserTags } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tags = await getUserTags(session.userId);
    return NextResponse.json({ success: true, tags });
  } catch (err: any) {
    console.error('Get tags error:', err);
    return NextResponse.json({ error: 'Failed to retrieve tags' }, { status: 500 });
  }
}
