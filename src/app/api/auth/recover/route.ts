import { NextResponse } from 'next/server';

/**
 * Account recovery and password reset are permanently disabled by design.
 * Global Send accounts are accessed strictly via the user's unrecoverable private login key.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Account recovery is not supported. Global Send login keys cannot be recovered or reset.',
    },
    { status: 404 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        'Account recovery is not supported. Global Send login keys cannot be recovered or reset.',
    },
    { status: 404 }
  );
}
