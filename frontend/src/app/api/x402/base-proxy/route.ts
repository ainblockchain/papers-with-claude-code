// DEPRECATED: Base payments now happen client-side using the user's
// passkey-derived EVM key. See src/lib/payment/base-x402-client.ts.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'gone',
      message:
        'This proxy endpoint is deprecated. Base payments are now signed client-side using your passkey-derived wallet.',
    },
    { status: 410 },
  );
}
