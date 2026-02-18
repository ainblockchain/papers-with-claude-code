import { NextResponse } from 'next/server';
import { listCourses } from '@/lib/content-store';

/**
 * GET /api/knowledge/list
 * Lists all published entries (metadata only, no content).
 */
export async function GET() {
  try {
    const entries = listCourses();
    return NextResponse.json({ ok: true, data: entries });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to list entries' },
      { status: 500 }
    );
  }
}
