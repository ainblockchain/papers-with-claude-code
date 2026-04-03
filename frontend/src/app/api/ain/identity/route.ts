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

    if (!stored) {
      return NextResponse.json({ ok: true, data: null });
    }

    if (!stored.keys || typeof stored.keys !== 'object') {
      return NextResponse.json({ ok: true, data: null });
    }

    for (const [, entry] of Object.entries(stored.keys as Record<string, any>)) {
      if (!entry?.encryptedPublicKey) continue;
      try {
        const publicKey = decryptPublicKey(entry.encryptedPublicKey);
        return NextResponse.json({ ok: true, data: { publicKey } });
      } catch {
        // This key was encrypted with a different secret — try next
        continue;
      }
    }

    // None decryptable
    return NextResponse.json({ ok: true, data: null });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to look up identity' },
      { status: 500 },
    );
  }
}

/** POST /api/ain/identity — add a new passkey mapping (supports multiple keys per user) */
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
    const stored = await ain.db.ref(`${IDENTITY_PATH}/${userId}`).getValue();

    // Check if this exact publicKey is already stored (any format)
    if (stored) {
      // New format: check all keys
      if (stored.keys && typeof stored.keys === 'object') {
        for (const [, entry] of Object.entries(stored.keys as Record<string, any>)) {
          if (!entry?.encryptedPublicKey) continue;
          try {
            const existing = decryptPublicKey(entry.encryptedPublicKey);
            if (existing === publicKey) {
              return NextResponse.json(
                { ok: false, error: 'This passkey is already registered' },
                { status: 409 },
              );
            }
          } catch {
            // Encrypted with different key — skip
          }
        }
      }
    }

    const encryptedPublicKey = encryptPublicKey(publicKey);
    const keyId = `key_${Date.now()}`;

    const existingKeys: Record<string, any> = {};
    if (stored?.keys && typeof stored.keys === 'object') {
      Object.assign(existingKeys, stored.keys);
    }

    // Add new key
    existingKeys[keyId] = {
      encryptedPublicKey,
      provider,
      createdAt: Date.now(),
    };

    const result = await ain.db.ref(`${IDENTITY_PATH}/${userId}`).setValue({
      value: { keys: existingKeys },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to store identity' },
      { status: 500 },
    );
  }
}
