import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

const COURSES_PATH = '/apps/knowledge/courses';

export async function GET() {
  try {
    const ain = getAinClient();
    const allCourses = await ain.db.ref(COURSES_PATH).getValue();
    return NextResponse.json({ ok: true, data: allCourses || {} });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get course locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ain = getAinClient();
    const body = await request.json();
    const { paperId, x, y, width, height, color, label } = body;

    if (!paperId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'paperId, x, and y are required' },
        { status: 400 }
      );
    }

    const result = await ain.db.ref(`${COURSES_PATH}/${paperId}`).setValue({
      value: {
        paperId,
        x,
        y,
        width: width ?? 4,
        height: height ?? 3,
        color: color ?? '#4A5568',
        label: label ?? paperId,
        registeredAt: Date.now(),
      },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to set course location' },
      { status: 500 }
    );
  }
}
