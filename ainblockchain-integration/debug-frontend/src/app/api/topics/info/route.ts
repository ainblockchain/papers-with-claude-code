import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicPath = searchParams.get('topicPath');

    if (!topicPath) {
      return NextResponse.json(
        { ok: false, error: 'topicPath query parameter is required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    const [info, subtopics] = await Promise.all([
      ain.knowledge.getTopicInfo(topicPath),
      ain.knowledge.listSubtopics(topicPath),
    ]);

    return NextResponse.json({ ok: true, data: { info, subtopics } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get topic info' },
      { status: 500 }
    );
  }
}
