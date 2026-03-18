import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';
import { encryptPublicKey, decryptPublicKey } from '@/lib/ain/identity-crypto';

// Stored under /apps/knowledge/topics which has rule: auth.addr !== ''
// This allows any wallet (including random service wallet) to write.
const IDENTITY_PATH = '/apps/knowledge/topics/identity';

/** GET /api/ain/identity?userId={userId} — look up existing identity mapping */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'userId is required' },
        { status: 400 },
      );
    }

    const ain = getAinClient();
    const stored = await ain.db.ref(`${IDENTITY_PATH}/${userId}`).getValue();

    if (!stored || !stored.encryptedPublicKey) {
      return NextResponse.json({ ok: true, data: null });
    }

    const publicKey = decryptPublicKey(stored.encryptedPublicKey);
    return NextResponse.json({ ok: true, data: { publicKey } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to look up identity' },
      { status: 500 },
    );
  }
}

/** POST /api/ain/identity — store new identity mapping (409 if already exists) */
export async function POST(request: NextRequest) {
  try {
    const { userId, publicKey, provider } = await request.json();

    if (!userId || !publicKey || !provider) {
      return NextResponse.json(
        { ok: false, error: 'userId, publicKey, and provider are required' },
        { status: 400 },
      );
    }

    const ain = getAinClient();

    // Check if mapping already exists
    const existing = await ain.db.ref(`${IDENTITY_PATH}/${userId}`).getValue();
    if (existing && existing.encryptedPublicKey) {
      return NextResponse.json(
        { ok: false, error: 'Identity mapping already exists' },
        { status: 409 },
      );
    }

    const encryptedPublicKey = encryptPublicKey(publicKey);
    const result = await ain.db.ref(`${IDENTITY_PATH}/${userId}`).setValue({
      value: {
        encryptedPublicKey,
        provider,
        createdAt: Date.now(),
      },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to store identity' },
      { status: 500 },
    );
  }
}
