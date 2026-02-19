import { NextRequest, NextResponse } from 'next/server';
import { publishContent } from '@/lib/ain/content-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title, price, payTo, description } = body;

    if (!content || !title || !price || !payTo) {
      return NextResponse.json(
        { ok: false, error: 'content, title, price, and payTo are required' },
        { status: 400 }
      );
    }

    const { contentId, contentHash } = publishContent({
      content,
      title,
      price: String(price),
      payTo,
      description: description || '',
    });

    return NextResponse.json({ ok: true, contentId, contentHash });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to publish content' },
      { status: 500 }
    );
  }
}
