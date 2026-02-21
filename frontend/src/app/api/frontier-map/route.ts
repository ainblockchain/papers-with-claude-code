import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicPath = searchParams.get('topicPath') ?? undefined;

    const ain = getAinClient();
    const raw = await ain.knowledge.getFrontierMap(topicPath);

    // ain-js returns FrontierMapEntry[] — convert to Record<string, stats> for the client
    const frontierMap: Record<string, any> = {};
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        frontierMap[entry.topic] = entry.stats;
      }
    } else {
      Object.assign(frontierMap, raw);
    }

    return NextResponse.json({ ok: true, data: frontierMap });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get frontier map' },
      { status: 500 }
    );
  }
}
