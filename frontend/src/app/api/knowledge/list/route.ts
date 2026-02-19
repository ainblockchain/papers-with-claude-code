import { NextResponse } from 'next/server';
import { listCourses } from '@/lib/ain/content-store';

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
