import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { incrementUserSessionVersion } from '@/lib/db';

export async function POST() {
  const session = await getSession();
  if (session?.userId) {
    await incrementUserSessionVersion(session.userId).catch(() => {});
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
