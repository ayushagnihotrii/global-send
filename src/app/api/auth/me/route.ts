import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { getUserById, getRawUserById } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const rawUser = await getRawUserById(session.userId);
  if (!rawUser) {
    await clearSessionCookie();
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Enforce session version invalidation
  const currentVersion = Number(rawUser.session_version || 1);
  if (session.sessionVersion && session.sessionVersion !== currentVersion) {
    await clearSessionCookie();
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await getUserById(session.userId);
  return NextResponse.json({
    authenticated: true,
    user,
    needsSecurityQuestion: !user?.hasSecurityQuestion,
  });
}
