import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

/**
 * POST /api/knowledge/publish-entry
 * Server-side orchestrator that calls ain-js knowledge.publishCourse().
 * Accepts { topicPath, title, content, summary, depth, tags, price }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicPath, title, content, summary, depth, tags, price, parentEntry, relatedEntries } = body;

    if (!topicPath || !title || !content || !price) {
      return NextResponse.json(
        { ok: false, error: 'topicPath, title, content, and price are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();

    // Determine gateway base URL from the request
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const gatewayBaseUrl = `${proto}://${host}`;

    const result = await ain.knowledge.publishCourse(
      {
        topicPath,
        title,
        content,
        summary: summary || '',
        depth: depth || 1,
        tags: tags || '',
        price: String(price),
        gatewayBaseUrl,
        parentEntry: parentEntry || null,
        relatedEntries: relatedEntries || null,
      }
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to publish entry' },
      { status: 500 }
    );
  }
}
