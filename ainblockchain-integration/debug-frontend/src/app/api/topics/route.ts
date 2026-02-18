import { NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

export async function GET() {
  try {
    const ain = getAinClient();
    const topics = await ain.knowledge.listTopics();

    return NextResponse.json({ ok: true, data: topics });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to list topics' },
      { status: 500 }
    );
  }
}
