import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicPath = searchParams.get('topicPath') ?? undefined;

    const ain = getAinClient();
    const frontierMap = await ain.knowledge.getFrontierMap(topicPath);
    return NextResponse.json({ ok: true, data: frontierMap });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get frontier map' },
      { status: 500 }
    );
  }
}
