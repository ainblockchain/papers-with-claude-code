import { NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';
import type { Series } from '@/types/paper';

let cachedResponse: { data: Series[]; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
      // courseIds is stored as { 0: "id", 1: "id", ... } — convert to array
      const courseIds: string[] = [];
      if (data.courseIds && typeof data.courseIds === 'object') {
        const keys = Object.keys(data.courseIds).sort((a, b) => Number(a) - Number(b));
        for (const key of keys) {
          courseIds.push(data.courseIds[key]);
        }
      }

      return {
        id: slug,
        title: data.title || slug,
        description: data.description || '',
        thumbnailUrl: data.thumbnailUrl || undefined,
        creatorAddress: data.creatorAddress || '',
        courseIds,
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
