import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicPath, title, description } = body;

    if (!topicPath || !title || !description) {
      return NextResponse.json(
        { ok: false, error: 'topicPath, title, and description are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    const result = await ain.knowledge.registerTopic(topicPath, { title, description });
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to register topic' },
      { status: 500 }
    );
  }
}
