import { NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';
import type { Series } from '@/types/paper';

let cachedResponse: { data: Series[]; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/** Convert AIN object { 0: "a", 1: "b" } to ordered array ["a", "b"] */
function toArray(obj: Record<string, string>): string[] {
  return Object.keys(obj)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => obj[k]);
}

export async function GET() {
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse.data);
  }

  try {
    const ain = getAinClient();
    const raw = await ain.db.ref('/apps/knowledge/series').getValue();

    if (!raw || typeof raw !== 'object') {
      return NextResponse.json([]);
    }

    const series: Series[] = Object.entries(raw).map(([slug, data]: [string, any]) => {
      const groups: Record<string, string[]> = {};

      if (data.groups && typeof data.groups === 'object') {
        for (const [groupName, ids] of Object.entries(data.groups)) {
          if (ids && typeof ids === 'object') {
            groups[groupName] = toArray(ids as Record<string, string>);
          }
        }
      }

      return {
        id: slug,
        title: data.title || slug,
        description: data.description || '',
        thumbnailUrl: data.thumbnailUrl || undefined,
        creatorAddress: data.creatorAddress || '',
        groups,
        createdAt: data.createdAt || 0,
      };
    });

    cachedResponse = { data: series, timestamp: Date.now() };
    return NextResponse.json(series);
  } catch (error) {
    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch series' },
      { status: 502 },
    );
  }
}
