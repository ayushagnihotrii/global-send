import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserByUsername,
  createUser,
  checkPersistentRateLimit,
} from '@/lib/db';
import {
  validateUsername,
  validateLoginKey,
  validateSecurityQuestion,
  validateSecurityAnswer,
  hashLoginKey,
  hashSecurityAnswer,
  setSessionCookie,
  createSessionToken,
} from '@/lib/auth';

const registerInputSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  key: z.string().min(1, 'Login key is required'),
  securityQuestion: z.string().min(1, 'Security question is required'),
  securityAnswer: z.string().min(1, 'Security answer is required'),
  acknowledgedWarning: z.boolean(),
  inviteCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

    // 1. Persistent IP-based rate limiting
    const ipAllowed = await checkPersistentRateLimit(`reg_ip_${ip}`, 10, 60000);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 2. Optional instance-level registration policy
    const allowRegistration = process.env.ALLOW_REGISTRATION?.trim().toLowerCase();
    const inviteCodeConfig = process.env.INVITE_CODE?.trim();

    if (allowRegistration === 'false') {
      return NextResponse.json(
        { error: 'Public registration is disabled on this private Global Send instance.' },
        { status: 403 }
      );
    }

    if (inviteCodeConfig) {
      const providedInvite = body.inviteCode?.trim();
      if (providedInvite !== inviteCodeConfig) {
        return NextResponse.json(
          { error: 'Invalid or missing invitation code.' },
          { status: 403 }
        );
      }
    }

    const rawKey =
      typeof body.key === 'string'
        ? body.key
        : typeof body.loginKey === 'string'
        ? body.loginKey
        : typeof body.password === 'string'
        ? body.password
        : '';

    const parseResult = registerInputSchema.safeParse({
      username: typeof body.username === 'string' ? body.username : '',
      key: rawKey,
      securityQuestion: typeof body.securityQuestion === 'string' ? body.securityQuestion : '',
      securityAnswer: typeof body.securityAnswer === 'string' ? body.securityAnswer : '',
      acknowledgedWarning: body.acknowledgedWarning,
      inviteCode: body.inviteCode,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid registration request' },
        { status: 400 }
      );
    }

    const { username, key, securityQuestion, securityAnswer, acknowledgedWarning } = parseResult.data;

    // 3. Validate acknowledgement
    if (acknowledgedWarning !== true) {
      return NextResponse.json(
        {
          error:
            'If I forget my key AND my security answer, my account cannot be recovered.',
        },
        { status: 400 }
      );
    }

    // 4. Validate username
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return NextResponse.json(
        { error: usernameCheck.error || 'Invalid username' },
        { status: 400 }
      );
    }

    // 5. Validate login key (must not equal username, 8-128 chars)
    const keyCheck = validateLoginKey(key, usernameCheck.display);
    if (!keyCheck.valid) {
      return NextResponse.json(
        { error: keyCheck.error || 'Invalid login key' },
        { status: 400 }
      );
    }

    // 6. Validate security question (10-150 chars)
    const questionCheck = validateSecurityQuestion(securityQuestion);
    if (!questionCheck.valid) {
      return NextResponse.json(
        { error: questionCheck.error || 'Invalid security question' },
        { status: 400 }
      );
    }

    // 7. Validate security answer (normalized >= 4 chars, must not equal username or key)
    const answerCheck = validateSecurityAnswer(securityAnswer, usernameCheck.display, key);
    if (!answerCheck.valid) {
      return NextResponse.json(
        { error: answerCheck.error || 'Invalid security answer' },
        { status: 400 }
      );
    }

    // 8. Enforce case-insensitive username uniqueness
    const existingUsername = await getUserByUsername(usernameCheck.normalized);
    if (existingUsername) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // 9. NOTE: Key uniqueness is removed! Two users can have the same key.
    const userId = crypto.randomUUID();
    const keyHash = await hashLoginKey(key);
    const answerHash = await hashSecurityAnswer(answerCheck.normalized);

    let user;
    try {
      user = await createUser(userId, usernameCheck.normalized, keyHash, null, {
        displayUsername: usernameCheck.display,
        securityQuestion: questionCheck.question,
        securityAnswerHash: answerHash,
      });
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '').toLowerCase();
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json(
          { error: 'This username is already taken. Please choose another.' },
          { status: 409 }
        );
      }
      throw dbErr;
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      sessionVersion: 1,
    };

    const token = await createSessionToken(sessionPayload, false);
    await setSessionCookie(sessionPayload, false);

    return NextResponse.json(
      {
        success: true,
        token,
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Global Send Registration Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
