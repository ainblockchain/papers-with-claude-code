import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const topicPath = searchParams.get('topicPath');

    if (!address || !topicPath) {
      return NextResponse.json(
        { ok: false, error: 'address and topicPath query parameters are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    const explorations = await ain.knowledge.getExplorations(address, topicPath);

    return NextResponse.json({ ok: true, data: explorations });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get explorations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicPath, title, content, summary, depth, tags, parentEntry, relatedEntries } = body;

    if (!topicPath || !title || !content) {
      return NextResponse.json(
        { ok: false, error: 'topicPath, title, and content are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    const exploreInput: Record<string, any> = {
      topicPath,
      title,
      content,
      summary: summary ?? '',
      depth: depth ?? 1,
      tags: Array.isArray(tags) ? tags.join(',') : (tags ?? ''),
    };
    if (parentEntry) {
      exploreInput.parentEntry = parentEntry;
    }
    if (relatedEntries && Array.isArray(relatedEntries) && relatedEntries.length > 0) {
      exploreInput.relatedEntries = relatedEntries;
    }
    const result = await ain.knowledge.explore(exploreInput);

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to create exploration' },
      { status: 500 }
    );
  }
}
