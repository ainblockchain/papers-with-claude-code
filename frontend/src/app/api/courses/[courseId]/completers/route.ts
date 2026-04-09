import { NextRequest, NextResponse } from 'next/server';
import { getAinClient, getUserAinClient } from '@/lib/ain/client';
import { decryptPublicKey } from '@/lib/ain/identity-crypto';

const IDENTITY_PATH = '/apps/knowledge/topics/identity';

/** Build address → avatarUrl map from blockchain identity data */
async function buildAddressProfileMap(): Promise<Map<string, string>> {
  const ain = getAinClient();
  const identities = await ain.db.ref(IDENTITY_PATH).getValue();
  const map = new Map<string, string>();

  if (!identities || typeof identities !== 'object') return map;

  for (const [userId, data] of Object.entries(identities as Record<string, any>)) {
    if (!data?.keys || typeof data.keys !== 'object') continue;

    // Skip non-GitHub users (kite- prefix has no avatar)
    if (userId.startsWith('kite-')) continue;

    const avatarUrl = `https://avatars.githubusercontent.com/u/${userId}`;

    for (const [, entry] of Object.entries(data.keys as Record<string, any>)) {
      if (!entry?.encryptedPublicKey) continue;
      try {
        const publicKey = decryptPublicKey(entry.encryptedPublicKey);
        // Derive the AIN wallet address the same way getUserAinClient does
        const userAin = getUserAinClient(publicKey);
        const address = userAin.wallet.defaultAccount?.address;
        if (address) {
          map.set(address.toLowerCase(), avatarUrl);
        }
      } catch {
        // Encrypted with different key — skip
      }
    }
  }

  return map;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const topicKey = `courses|${courseId}`;

  try {
    const ain = getAinClient();
    const [allExplorations, profileMap] = await Promise.all([
      ain.db.ref('/apps/knowledge/explorations').getValue(),
      buildAddressProfileMap(),
    ]);

    if (!allExplorations || typeof allExplorations !== 'object') {
      return NextResponse.json({ ok: true, data: [] });
    }

    const completers: {
      address: string;
      stagesCleared: number;
      avatarUrl?: string;
    }[] = [];

    for (const [address, topics] of Object.entries(allExplorations)) {
      if (!topics || typeof topics !== 'object') continue;
      const entries = (topics as Record<string, any>)[topicKey];
      if (!entries || typeof entries !== 'object') continue;

      let stagesCleared = 0;
      for (const [, entry] of Object.entries(entries as Record<string, any>)) {
        if (entry && typeof entry === 'object' && entry.depth === 2) {
          stagesCleared++;
        }
      }

      if (stagesCleared > 0) {
        // Only include users whose identity is resolvable in the current environment
        const avatarUrl = profileMap.get(address.toLowerCase());
        if (!avatarUrl) continue;
        completers.push({ address, stagesCleared, avatarUrl });
      }
    }

    completers.sort((a, b) => b.stagesCleared - a.stagesCleared);

    return NextResponse.json({ ok: true, data: completers });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get completers' },
      { status: 500 },
    );
  }
}
