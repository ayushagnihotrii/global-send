import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByUsername, checkPersistentRateLimit } from '@/lib/db';
import { validateUsername, getDeterministicFakeQuestion } from '@/lib/auth';

const questionRequestSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

    // 1. Persistent IP-based rate limiting on recovery endpoints
    const ipAllowed = await checkPersistentRateLimit(`recovery_ip_${ip}`, 15, 60000);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Too many recovery attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = questionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter your username.' },
        { status: 400 }
      );
    }

    const { username } = parseResult.data;
    const usernameValidation = validateUsername(username);
    const normalizedUsername = usernameValidation.normalized;

    // 2. Persistent account-level rate limiting
    const userAllowed = await checkPersistentRateLimit(`recovery_req_${normalizedUsername}`, 10, 60000);
    if (!userAllowed) {
      return NextResponse.json(
        { error: 'Too many recovery requests for this account. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // 3. User lookup
    const user = await getUserByUsername(normalizedUsername);

    // Return the actual configured security question if present
    if (user && user.security_question) {
      return NextResponse.json({
        question: user.security_question,
      });
    }

    // To prevent username enumeration, return a deterministic fake question derived from HMAC(username)
    const fakeQuestion = getDeterministicFakeQuestion(normalizedUsername);
    return NextResponse.json({
      question: fakeQuestion,
    });
  } catch (err: any) {
    console.error('[Global Send Recovery Question Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to retrieve recovery question. Please try again.' },
      { status: 500 }
    );
  }
}
